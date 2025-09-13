"use client";
import { useRef, useState } from "react";

function pickMime() {
  const c = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",          // Safari fallback (newer versions)
    "audio/mpeg"
  ];
  for (const t of c) {
    // @ts-ignore
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

export default function WhisperMic({
  onText,
  className,
}: {
  onText: (text: string) => void;
  className?: string;
}) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        try {
          setBusy(true);
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          const fd = new FormData();
          fd.append("audio", new File([blob], "audio.webm", { type: blob.type }));
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          const data = await res.json();
          if (data?.text) onText(data.text);
          else setError(data?.error || "No transcript");
        } catch (e: any) {
          setError("Transcription failed");
        } finally {
          setBusy(false);
        }
      };

      mr.start();
      setRec(mr);
    } catch (e: any) {
      setError("Mic permission denied or unsupported browser");
    }
  };

  const stop = () => {
    rec?.stop();
    rec?.stream.getTracks().forEach((t) => t.stop());
    setRec(null);
  };

  const listening = !!rec;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        onClick={listening ? stop : start}
        disabled={busy}
        className={`rounded px-3 py-2 text-sm ${
          listening ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-zinc-800"
        }`}
        title={listening ? "Stop recording" : "Speak"}
      >
        {listening ? "■ Stop" : busy ? "…" : "🎤 Speak"}
      </button>
      {busy && <span className="text-xs text-gray-500">Transcribing…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
