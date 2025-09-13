"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import WhisperMic from "./WhisperMic";

type Msg = { role: "user" | "assistant"; content: string };

// --- helpers to parse and sanitize image refs coming from the model ---
function sanitizeUrl(u: string): string {
  if (!u) return "";
  let x = u.trim();
  x = x.replace(/^sandbox:/i, "").replace(/^file:\/\//i, "");
  if (x.startsWith("http://") || x.startsWith("https://") || x.startsWith("/")) return x;
  if (x.startsWith("memory/")) return `/${x}`;
  return `/${x}`;
}

function parseContentForImages(raw: string): { text: string; images: string[] } {
  let text = String(raw ?? "");
// Remove Google Maps links (markdown or bare)
   text = text.replace(/\[.*?\]\(https?:\/\/www\.google\.com\/maps[^\)]*\)/gi, "");
   text = text.replace(/https?:\/\/www\.google\.com\/maps[^\s)]+/gi, "");

  // Collect URLs from "IMG: <url>"
  const imgHintUrls: string[] = [];
  for (const line of text.split(/\n+/)) {
    const m = line.trim().match(/^img:\s*(.+)$/i);
    if (m?.[1]) imgHintUrls.push(m[1].trim());
  }
  // Remove those lines from text
  text = text.replace(/^img:\s*.+$/gim, "").trim();

  // Collect from markdown ![alt](url)
  const mdUrls: string[] = [];
  const mdImg = /!\[[^\]]*\]\(([^)]+)\)/gi;
  let mm: RegExpExecArray | null;
  while ((mm = mdImg.exec(text)) !== null) {
    if (mm[1]) mdUrls.push(mm[1].trim());
  }
  // Strip the markdown image tags
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/gi, "").trim();

  // Also catch bare image URLs in the text
  const bareUrls: string[] = [];
  const bare = /(?:^|\s)(https?:\/\/[^\s)]+|\/[^\s)]+|(?:memory\/[^\s)]+))(?=\s|$)/gi;
  let bm: RegExpExecArray | null;
  while ((bm = bare.exec(text)) !== null) {
    const u = bm[1];
    if (/\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(u)) bareUrls.push(u.trim());
  }

  const all = [...imgHintUrls, ...mdUrls, ...bareUrls]
    .map(sanitizeUrl)
    .filter(Boolean);

  // Uniq and keep order
  const seen = new Set<string>();
  const images = all.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

  return { text, images };
}

export default function ChatPanel({
  patientId = "patient123",
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
}: {
  patientId?: string;
  tz?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          tz,
          messages: history,
        }),
      });

      const data = await res.json();

      // assistant message
      const assistantText: string =
        data?.message?.content ??
        "Sorry, I couldn’t generate a response right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);

      // NEW: handle meta (maps + emergency alert)
      const meta = data?.meta;
      if (meta?.mapUrl) {
        window.open(meta.mapUrl, "_blank", "noopener,noreferrer");
      }
      if (meta?.emergencyNotified) {
        const count = meta?.contactsCount ?? 0;
        alert(
          `Help has been notified (${count} contact${count === 1 ? "" : "s"}). Please stay where you are.`
        );
      }


    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="w-full">
      <div className="h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-zinc-800 p-3">
        {messages.map((m, i) => {
          const { text, images } = parseContentForImages(m.content);
          return (
            <MessageBubble key={i} isUser={m.role === "user"} imageUrls={images}>
              {text}
            </MessageBubble>
          );
        })}

        {loading && (
          <MessageBubble isUser={false}>Thinking…</MessageBubble>
        )}

        <div ref={endRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <textarea
          className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <WhisperMic onText={(t) => t && send(t)} />
        <button
          onClick={() => send()}
          disabled={loading}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
