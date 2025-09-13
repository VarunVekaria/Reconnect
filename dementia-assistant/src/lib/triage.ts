// src/lib/triage.ts
import { openai } from "@/lib/openai";

export type TriageResult = {
  isMedical: boolean;
  severity: "low" | "moderate" | "urgent";   // for doctor sort
  categories: string[];                      // ["pain","fall","medication",...]
  reasons?: string;
};

const KEYWORDS: Record<string, string[]> = {
  pain: ["pain", "ache", "hurts", "cramp", "headache", "stomachache", "toothache"],
  fall: ["fell", "fall", "slipped", "dizzy", "faint", "blackout"],
  breathing: ["breath", "breathing", "short of breath", "wheez", "asthma"],
  bleeding: ["bleed", "bleeding", "blood", "cut"],
  mental: ["confused", "panic", "anxious", "depressed", "hallucination"],
  fever: ["fever", "temperature", "chills"],
  medication: ["missed pill", "meds", "dose", "overdose", "side effect", "nausea after pill"],
};

function keywordTriage(text: string): TriageResult | null {
  const t = text.toLowerCase();
  const cats = Object.entries(KEYWORDS)
    .filter(([, words]) => words.some(w => t.includes(w)))
    .map(([k]) => k);

  if (!cats.length) return null;

  const isUrgent =
    cats.includes("bleeding") || cats.includes("fall") || cats.includes("breathing");

  return {
    isMedical: true,
    severity: isUrgent ? "urgent" : "moderate",
    categories: cats,
    reasons: "Matched medical keywords",
  };
}

/** LLM fallback to catch subtle cases; cheap model + very small prompt. */
export async function llmTriage(userText: string, assistantText?: string): Promise<TriageResult> {
  const sys = `You classify if a patient's message needs medical attention.
Return JSON with: isMedical (true/false), severity ("low"|"moderate"|"urgent"), categories[], reasons.
Mark URGENT if there's fall, severe pain, bleeding, breathing issues, chest pain, stroke signs. Be conservative.`;

  const user = `PATIENT: ${userText}\nASSISTANT: ${assistantText ?? ""}`;
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" } as any
  });

  try {
    const j = JSON.parse(r.choices[0].message.content ?? "{}");
    return {
      isMedical: !!j.isMedical,
      severity: (j.severity ?? "low") as TriageResult["severity"],
      categories: Array.isArray(j.categories) ? j.categories : [],
      reasons: j.reasons ?? "LLM assessment",
    };
  } catch {
    return { isMedical: false, severity: "low", categories: [], reasons: "parse_error" };
  }
}

/** Main triage: fast keyword pass, else LLM. */
export async function triageMedical(
  userText: string,
  assistantText?: string
): Promise<TriageResult> {
  const kw = keywordTriage(userText);
  if (kw) return kw;
  return llmTriage(userText, assistantText);
}
