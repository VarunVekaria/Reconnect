// src/app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MemoryPopup from "./MemoryPopup";

type Person = { name: string; relation?: string; contactNumber?: string };
type MemoryItem = {
  id: string;
  patientId: string;
  storagePath: string;
  event?: string;
  eventDate?: string;
  place?: string;
  people?: Person[];
  createdAt?: string;
  type?: "memory" | "person";
};

type VoiceNote = {
  id: string;
  memoryId: string;
  patientId: string;
  personName?: string;
  audioPath: string;   // e.g. "/voice-notes/vnote_...webm"
  createdAt: string;
};

export default function Page() {
  const [memory, setMemory] = useState<MemoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // voice note ui state
  const [vnLoading, setVnLoading] = useState(false);
  const [vnMsg, setVnMsg] = useState<string | null>(null);
  const [personLabel, setPersonLabel] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const patientId = "patient123";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/memory/list?patientId=${encodeURIComponent(patientId)}`);
        const data = await res.json();
        const items: MemoryItem[] = Array.isArray(data?.items) ? data.items : [];
        const memories = items.filter((m) => m?.type === "memory");

        const sorted = (memories.length ? memories : items).slice().sort((a, b) => {
          const aCreated = a.createdAt ? Date.parse(a.createdAt) : NaN;
          const bCreated = b.createdAt ? Date.parse(b.createdAt) : NaN;
          if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) return bCreated - aCreated;

          const aEvent = a.eventDate ? Date.parse(a.eventDate) : NaN;
          const bEvent = b.eventDate ? Date.parse(b.eventDate) : NaN;
          if (!Number.isNaN(aEvent) && !Number.isNaN(bEvent) && aEvent !== bEvent) return bEvent - aEvent;

          return String(b.id).localeCompare(String(a.id));
        });

        if (!cancelled) setMemory(sorted[0] || null);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load memories");
          setMemory(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => { cancelled = true; };
  }, [patientId]);

  const header = useMemo(() => (
    <div className="mb-4">
      <h1 className="text-xl font-semibold">Patient Profile</h1>
      <p className="text-sm text-gray-500">Auto-selected latest memory</p>
    </div>
  ), []);

  async function checkAndPlayVoiceNote() {
    if (!memory?.id) return;
    setVnMsg(null);
    setVnLoading(true);
    setPersonLabel(null);

    try {
      const r = await fetch(`/api/voice/list?memoryId=${encodeURIComponent(memory.id)}`, { cache: "no-store" });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `Request failed (${r.status})`);
      }
      const j = await r.json();
      const notes: VoiceNote[] = Array.isArray(j?.notes) ? j.notes : [];
      if (!notes.length) {
        setVnMsg("No voice note yet for this memory.");
        // clear any previous audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        }
        return;
      }

      // pick latest
      const latest = notes.sort(
        (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
      )[0];

      // set audio src and play
      if (audioRef.current) {
        audioRef.current.src = latest.audioPath; // must match /public/voice-notes/*
        await audioRef.current.load();
        // play can be blocked by autoplay policy — user clicked the button so it should be allowed
        await audioRef.current.play().catch(() => {});
      }
      setPersonLabel(latest.personName || null);
      setVnMsg(null);
    } catch (e: any) {
      setVnMsg(e?.message || "Could not load voice note.");
    } finally {
      setVnLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        {header}
        <div className="rounded-xl border p-4 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        {header}
        <div className="rounded-xl border p-4 text-sm text-red-600">{err}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {header}

      <MemoryPopup memory={memory || undefined} />

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={checkAndPlayVoiceNote}
            disabled={!memory?.id || vnLoading}
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
          >
            {vnLoading ? "Checking…" : "▶️ Play voice note"}
          </button>
          {personLabel && (
            <div className="text-sm text-gray-700">
              Playing voice note{personLabel ? ` from ${personLabel}` : ""}.
            </div>
          )}
        </div>

        {vnMsg && <div className="text-xs text-gray-600">{vnMsg}</div>}

        <audio ref={audioRef} controls className="w-full" />
      </div>
    </div>
  );
}
