"use client";
import { useRef, useState } from "react";

function pickMime() {
  const c = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4", // Safari (newer)
    "audio/mpeg",
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
        } catch {
          setError("Transcription failed");
        } finally {
          setBusy(false);
        }
      };

      mr.start();
      setRec(mr);
    } catch {
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
        aria-label={listening ? "Stop recording" : "Start recording"}
        title={listening ? "Stop recording" : "Speak"}
        className={`grid h-10 w-10 place-items-center rounded-xl border transition
          ${listening ? "bg-red-600 text-white border-red-600" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
      >
        {/* mic icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM13 19.9V22h-2v-2.1a8.1 8.1 0 01-6-3.3l1.6-1.2a6.1 6.1 0 0010.8 0l1.6 1.2a8.1 8.1 0 01-6 3.3z"/>
        </svg>
      </button>

      {listening && (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          Listening…
        </span>
      )}
      {busy && <span className="text-xs text-gray-500">Transcribing…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
