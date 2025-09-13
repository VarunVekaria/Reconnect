"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import WhisperMic from "./WhisperMic";   // <-- add

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPanel({
  patientId = "patient123",
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
}: { patientId?: string; tz?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // accept optional override text (used by STT)
  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (!overrideText) setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          tz,
          messages: next.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data?.message?.content ?? "Sorry, I couldn’t process that.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);

      // Act on meta (maps/emergency) – you already added this earlier
      const meta = data?.meta;
      if (meta?.mapUrl) window.open(meta.mapUrl, "_blank", "noopener,noreferrer");
      if (meta?.emergencyNotified) {
        alert(`Help has been notified (${meta.contactsCount} contact${meta.contactsCount === 1 ? "" : "s"}). Please stay where you are.`);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "There was a problem. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="w-full">
      <div className="h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-zinc-800 p-4 mb-4 bg-white/70 dark:bg-zinc-900/50">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role}>{m.content}</MessageBubble>
        ))}
        {loading && <MessageBubble role="assistant">Thinking…</MessageBubble>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder='Try: press 🎤 and say “What should I do now?”'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <WhisperMic onText={(t) => t && send(t)} />   {/* <-- add */}
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
