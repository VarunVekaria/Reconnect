"use client";
import { useEffect, useRef, useState } from "react";

export default function VoiceUploadPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!rec) return;
    const onData = (e: BlobEvent) => setChunks((c) => [...c, e.data]);
    const onStop = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      setChunks([]);
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.src = url;
    };
    rec.addEventListener("dataavailable", onData);
    rec.addEventListener("stop", onStop);
    return () => {
      rec.removeEventListener("dataavailable", onData);
      rec.removeEventListener("stop", onStop);
    };
  }, [rec, chunks]);

  async function start() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const typeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    let mime = typeCandidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || "audio/webm";
    const r = new MediaRecorder(stream, { mimeType: mime });
    setRec(r);
    setChunks([]);
    r.start(200);
  }

  function stop() { rec?.stop(); setRec(null); }

  async function upload() {
    try {
      setBusy(true);
      setError(null);
      const el = audioRef.current;
      if (!el?.src) throw new Error("No recording to upload");
      const resBlob = await fetch(el.src).then((r) => r.blob());
      const fd = new FormData();
      fd.set("token", token);
      fd.set("audio", resBlob, "note.webm");
      const r = await fetch("/api/voice/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "upload failed");
      alert("Thanks! Your voice note was uploaded.");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-lg font-semibold mb-2">Leave a short voice note</h1>
      <p className="text-sm text-gray-600 mb-4">Tap record, speak about this memory, then upload.</p>

      <div className="flex items-center gap-3 mb-3">
        {!rec ? (
          <button onClick={start} className="px-3 py-2 rounded bg-gray-200">🎙️ Record</button>
        ) : (
          <button onClick={stop} className="px-3 py-2 rounded bg-red-600 text-white">■ Stop</button>
        )}
        <button onClick={upload} disabled={busy} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
          ⬆️ Upload
        </button>
      </div>

      <audio ref={audioRef} controls className="w-full" />
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
}
