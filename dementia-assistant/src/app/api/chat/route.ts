import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import {
  getCurrentSchedule,
  retrieveContext,
  getNavigationTarget,
  sendEmergencyAlert,
  getMemoriesByDate,
} from "@/lib/tools";
import type { ChatMessage } from "@/lib/types";
import { triageMedical } from "@/lib/triage";  // <-- NEW

const BodySchema = z.object({
  patientId: z.string().min(3),
  tz: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
        name: z.string().optional(),
      })
    )
    .min(1),
});

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments?: string };
};

function safeJSON(s?: string) {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { patientId, tz, messages } = parsed.data;
  const safePid = patientId; // never trust model-provided IDs
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // ---- Tools schema (note: we ignore any model-provided patientId at execution time) ----
  const tools: any = [
    {
      type: "function",
      function: {
        name: "getCurrentSchedule",
        description: "Return the patient's current or next schedule item.",
        parameters: {
          type: "object",
          properties: {
            tz: { type: "string", description: "IANA timezone (optional)" },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "retrieveContext",
        description: "Fetch patient-specific preferences and caregiver info.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    {
      type: "function",
      function: {
        name: "getNavigationTarget",
        description:
          "Return the best place to go now (schedule location or home) including a Google Maps URL.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    {
      type: "function",
      function: {
        name: "sendEmergencyAlert",
        description: "Notify the patient's emergency contacts.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "object",
              properties: { lat: { type: "number" }, lng: { type: "number" } },
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getMemoriesByDate",
        description:
          "Fetch memory-book photos and details for a given date phrase (e.g., 'today', '7 june', '2024-06-07').",
        parameters: {
          type: "object",
          properties: {
            // We ignore model-provided patientId in execution and use the authenticated/safe one
            patientId: { type: "string" },
            dateQuery: { type: "string", description: "Natural or explicit date text" },
          },
          required: ["patientId"],
          additionalProperties: false,
        },
      },
    },
  ];

  // ---- Round 1: allow the model to choose a tool ----
  const chatMessagesRound1 = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Patient timezone: ${tz ?? process.env.DEFAULT_TZ ?? "America/New_York"}`,
    },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
      .map((m) => ({ role: m.role, content: m.content })) as ChatMessage[],
  ];

  const first = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: chatMessagesRound1 as any,
    tools,
    tool_choice: "auto",
  });

  const m = first.choices[0].message;
  const toolCalls = (m as any).tool_calls as ToolCall[] | undefined;

  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    const fn = call.function.name;
    const args = safeJSON(call.function.arguments);
    let toolResult: any = null;
    let meta: any = undefined;

    // ---- Execute tool (always use safePid) ----
    if (fn === "getCurrentSchedule") {
      toolResult = await getCurrentSchedule(safePid);

    } else if (fn === "retrieveContext") {
      toolResult = await retrieveContext(safePid);

    } else if (fn === "getNavigationTarget") {
      toolResult = await getNavigationTarget(safePid);
      if (toolResult?.mapUrl) meta = { mapUrl: toolResult.mapUrl, label: toolResult.label };

    } else if (fn === "sendEmergencyAlert") {
      toolResult = await sendEmergencyAlert(safePid, args.location);
      meta = {
        emergencyNotified: !!toolResult?.notified,
        contactsCount: toolResult?.contactsCount ?? 0,
      };

    } else if (fn === "getMemoriesByDate") {
      const dateQuery = (args?.dateQuery as string) || undefined;
      const results = await getMemoriesByDate(safePid, dateQuery);

      if (Array.isArray(results) && results.length) {
        const top = results[0];
        const people = (top.people || [])
          .map((p: any) => (p.relation ? `${p.name} (${p.relation})` : p.name))
          .join(", ");

        toolResult = {
          ok: true,
          results,
          summary:
            `${top.event || "Memory"} on ${top.eventDate}` +
            (top.place ? ` at ${top.place}` : "") +
            (people ? ` — with ${people}` : ""),
        };

        // Provide image hint via meta; UI can render it (IMG: ...)
        const sanitizeUrl = (u?: string) => {
            if (!u) return undefined;
            let x = u.trim().replace(/^sandbox:/i, "").replace(/^file:\/\//i, "");
            if (x.startsWith("http://") || x.startsWith("https://") || x.startsWith("/")) return x;
            if (x.startsWith("memory/")) return `/${x}`;
            return `/${x}`;
          };
          meta = { imageUrl: sanitizeUrl(top.storagePath) };
          
      } else {
        toolResult = { ok: false, results: [], summary: "No memories found for that date." };
      }

    } else {
      toolResult = { error: `Unknown tool: ${fn}` };
    }

    // ---- Round 2: include the assistant message with tool_calls, then the tool reply ----
    const chatMessagesRound2 = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant" || msg.role === "system")
        .map((msg) => ({ role: msg.role, content: msg.content })) as any[],
      m as any, // assistant message with tool_calls
      {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      } as any,
    ];

    const second = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: chatMessagesRound2 as any,
    });

    // Optionally append an IMG marker so the chat UI can render the image
    let finalMessage = second.choices[0].message;
    if (meta?.imageUrl) {
      finalMessage = {
        ...finalMessage,
        content: ((finalMessage.content as string) || "") + `\n\nIMG: ${meta.imageUrl}`,
      } as any;
    }

    // ---- TRIAGE + logging (tool / nav / emergency) ----
    try {
      const lastUserText = messages[messages.length - 1]?.content ?? "";
      const assistantText = (finalMessage.content as string) ?? "";
      const triage = await triageMedical(lastUserText, assistantText);

      const tags = triage.isMedical ? ["medical"] : [];
      const severity = triage.severity;
      const categories = triage.categories;
      const reasons = triage.reasons;

      await fetch(`${base}/api/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type: meta?.mapUrl ? "nav" : meta?.emergencyNotified ? "emergency" : "tool",
          text: lastUserText,
          meta,
          // triage fields
          tags,
          severity,
          categories,
          reasons,
        }),
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ message: finalMessage, meta });
  }

  // ---- No tool needed: TRIAGE + log as plain chat ----
  try {
    const lastUserText = messages[messages.length - 1]?.content ?? "";
    const assistantText = (m as any)?.content ?? "";
    const triage = await triageMedical(lastUserText, assistantText);

    const tags = triage.isMedical ? ["medical"] : [];
    const severity = triage.severity;
    const categories = triage.categories;
    const reasons = triage.reasons;

    await fetch(`${base}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        type: "chat",
        text: lastUserText,
        // triage fields
        tags,
        severity,
        categories,
        reasons,
      }),
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ message: m });
}
