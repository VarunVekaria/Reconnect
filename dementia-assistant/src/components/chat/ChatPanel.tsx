"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import WhisperMic from "./WhisperMic";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "What should I do now?",
  "Where should I go?",
  "I need help",
  "What happened on this day?",
];

// --- helpers to parse/sanitize image refs coming from the model ---
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

  // Hide Google Maps links in visible text (we open them via meta)
  text = text.replace(/\[.*?\]\(https?:\/\/www\.google\.com\/maps[^\)]*\)/gi, "");
  text = text.replace(/https?:\/\/www\.google\.com\/maps[^\s)]+/gi, "");

  // img: <url>
  const imgHintUrls: string[] = [];
  for (const line of text.split(/\n+/)) {
    const m = line.trim().match(/^img:\s*(.+)$/i);
    if (m?.[1]) imgHintUrls.push(m[1].trim());
  }
  text = text.replace(/^img:\s*.+$/gim, "").trim();

  // Markdown images
  const mdUrls: string[] = [];
  const mdImg = /!\[[^\]]*\]\(([^)]+)\)/gi;
  let mm: RegExpExecArray | null;
  while ((mm = mdImg.exec(text)) !== null) if (mm[1]) mdUrls.push(mm[1].trim());
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/gi, "").trim();

  // Bare image URLs
  const bareUrls: string[] = [];
  const bare = /(?:^|\s)(https?:\/\/[^\s)]+|\/[^\s)]+|(?:memory\/[^\s)]+))(?=\s|$)/gi;
  let bm: RegExpExecArray | null;
  while ((bm = bare.exec(text)) !== null) {
    const u = bm[1];
    if (/\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(u)) bareUrls.push(u.trim());
  }

  const all = [...imgHintUrls, ...mdUrls, ...bareUrls].map(sanitizeUrl).filter(Boolean);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // auto-resize textarea (1..6 rows)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const max = 6 * 24; // ~ line-height * rows
    const next = Math.min(max, el.scrollHeight);
    el.style.height = next + "px";
  }, [input]);

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
        body: JSON.stringify({ patientId, tz, messages: history }),
      });

      const data = await res.json();

      const assistantText: string =
        data?.message?.content ?? "Sorry, I couldn’t generate a response right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);

      // act on meta (maps + emergency)
      const meta = data?.meta;
      if (meta?.mapUrl) window.open(meta.mapUrl, "_blank", "noopener,noreferrer");
      if (meta?.emergencyNotified) {
        const count = meta?.contactsCount ?? 0;
        alert(`Help has been notified (${count} contact${count === 1 ? "" : "s"}). Please stay where you are.`);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
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
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white text-sm">AI</div>
          <div>
            <div className="font-medium">Assistant</div>
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> online
            </div>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void send(q)}
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:scale-[0.99]"
            >
              {q}
            </button>
          ))}
        </div>
      </header>

      {/* Chat canvas and composer share the same max width */}
      <div className="relative">
        {/* Chat window */}
        <div className="h-[68vh] overflow-y-auto rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 shadow-sm">
          {messages.map((m, i) => {
            const { text, images } = parseContentForImages(m.content);
            return (
              <MessageBubble key={i} isUser={m.role === "user"} imageUrls={images}>
                {text}
              </MessageBubble>
            );
          })}
          {loading && <MessageBubble isUser={false}>Thinking…</MessageBubble>}
          <div ref={endRef} />
        </div>

        {/* Composer — same width, mic + send on RIGHT */}
        <div className="pointer-events-none sticky bottom-0 -mb-10 mt-4">
          <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-gray-300 bg-white/95 p-1.5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
            <div className="flex items-end gap-1.5">
              {/* Input (long & thin) */}
              <textarea
                ref={textareaRef}
                rows={1}
                maxLength={500}
                className="min-h-[44px] max-h-[144px] flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
              />

              {/* RIGHT: mic then send */}
              <div className="flex items-center gap-1.5">
                <WhisperMic onText={(t) => t && send(t)} />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 11.5l17-8-7.5 17-2.5-6-7-3z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
         
        </div>
      </div>
    </div>
  );
}
