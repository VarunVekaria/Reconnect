"use client";
import { useRef, useState } from "react";

export default function VoiceUploadPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function pickMimeType(): string | undefined {
    // Try best → ok across modern browsers
    const candidates = [
      "audio/webm;codecs=opus",     // Chrome/Edge
      "audio/webm",                 // Chrome/Edge fallback
      "audio/ogg;codecs=opus",      // Firefox
      "audio/mp4;codecs=mp4a.40.2", // Safari/iOS (AAC)
      "audio/mp4",                  // Safari fallback
    ];
    for (const t of candidates) {
      // Some browsers don't expose isTypeSupported; guard it
      if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported) {
        if ((MediaRecorder as any).isTypeSupported(t)) return t;
      }
    }
    // Let browser choose if none matched (works in many cases)
    return undefined;
  }

  async function start() {
    setError(null);
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support microphone access.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      // Ask for mic; extra constraints help quality and echo
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow access and try again."
          : e?.name === "NotFoundError"
          ? "No microphone found."
          : "Could not access microphone. Ensure you're on HTTPS or localhost and try again."
      );
      return;
    }

    try {
      chunksRef.current = [];
      const mime = pickMimeType();
      const options = mime ? { mimeType: mime } : undefined;

      const recorder = new MediaRecorder(streamRef.current!, options as any);

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstart = () => setIsRecording(true);

      recorder.onstop = () => {
        setIsRecording(false);
        const chosenType = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: chosenType });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.src = url;

        // Clean up stream tracks after stop
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setRec(null);
      };

      setRec(recorder);
      // Timeslice: emit chunks periodically. Some browsers prefer 1000ms.
      recorder.start(1000);
    } catch (e: any) {
      setError("Failed to start recording. " + (e?.message || ""));
      // safety cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }

  function stop() {
    try {
      rec?.stop();
    } catch (e) {
      // ignore
    }
  }

  async function upload() {
    try {
      setBusy(true);
      setError(null);
      const el = audioRef.current;
      if (!el?.src) throw new Error("No recording to upload");

      const resBlob = await fetch(el.src).then((r) => r.blob());
      const ext =
        resBlob.type.includes("mp4") ? "m4a" :
        resBlob.type.includes("ogg") ? "ogg" :
        resBlob.type.includes("webm") ? "webm" : "webm";

      const fd = new FormData();
      fd.set("token", token);
      fd.set("audio", resBlob, `note.${ext}`);

      const r = await fetch("/api/voice/upload", { method: "POST", body: fd });

      // ← don’t assume JSON; read content-type first
      const ct = r.headers.get("content-type") || "";
      if (!r.ok) {
        const body = ct.includes("application/json") ? await r.json() : await r.text();
        const msg = typeof body === "string" ? body : body?.error || JSON.stringify(body);
        throw new Error(msg);
      }

      const j = ct.includes("application/json") ? await r.json() : {};
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
      <p className="text-sm text-gray-600 mb-4">
        Tap <strong>Record</strong>, speak about this memory, then <strong>Upload</strong>.
      </p>

      <div className="flex items-center gap-3 mb-3">
        {!isRecording ? (
          <button
            onClick={start}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
          >
            🎙️ Record
          </button>
        ) : (
          <button
            onClick={stop}
            disabled={busy}
            className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
          >
            ■ Stop
          </button>
        )}
        <button
          onClick={upload}
          disabled={busy}
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          ⬆️ Upload
        </button>
      </div>

      <audio ref={audioRef} controls className="w-full" />
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      <div className="text-xs text-gray-500 mt-4 space-y-1">
        <div>Tips:</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use HTTPS (or localhost) so the mic permission works.</li>
          <li>On iPhone/Safari, recording uses AAC (mp4/m4a). On Chrome it uses WebM/Opus.</li>
          <li>If nothing happens, check your browser’s mic permission in site settings.</li>
        </ul>
      </div>
    </div>
  );
}
