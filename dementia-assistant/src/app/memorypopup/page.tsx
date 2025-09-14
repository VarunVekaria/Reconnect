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

  // voice note UI state (unchanged behavior)
  const [vnLoading, setVnLoading] = useState(false);
  const [vnMsg, setVnMsg] = useState<string | null>(null);
  const [personLabel, setPersonLabel] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const patientId = "patient123";

  // --- load latest memory (same logic as before) ---
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/memory/list?patientId=${encodeURIComponent(patientId)}`
        );
        const data = await res.json();

        const items: MemoryItem[] = Array.isArray(data?.items) ? data.items : [];
        const memories = items.filter((m) => m?.type === "memory");

        const sorted = (memories.length ? memories : items)
          .slice()
          .sort((a, b) => {
            const aCreated = a.createdAt ? Date.parse(a.createdAt) : NaN;
            const bCreated = b.createdAt ? Date.parse(b.createdAt) : NaN;
            if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
              return bCreated - aCreated;
            }
            const aEvent = a.eventDate ? Date.parse(a.eventDate) : NaN;
            const bEvent = b.eventDate ? Date.parse(b.eventDate) : NaN;
            if (!Number.isNaN(aEvent) && !Number.isNaN(bEvent) && aEvent !== bEvent) {
              return bEvent - aEvent;
            }
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
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // --- check & play latest voice note (same logic) ---
  async function checkAndPlayVoiceNote() {
    if (!memory?.id) return;
    setVnMsg(null);
    setVnLoading(true);
    setPersonLabel(null);

    try {
      const r = await fetch(`/api/voice/list?memoryId=${encodeURIComponent(memory.id)}`, {
        cache: "no-store",
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `Request failed (${r.status})`);
      }
      const j = await r.json();
      const notes: VoiceNote[] = Array.isArray(j?.notes) ? j.notes : [];
      if (!notes.length) {
        setVnMsg("No voice note yet for this memory.");
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        }
        return;
      }

      // latest first
      const latest = notes.sort(
        (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
      )[0];

      if (audioRef.current) {
        audioRef.current.src = latest.audioPath;
        await audioRef.current.load();
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

  // --- UI: fullscreen gradient + centered modal like the second file ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* dim/backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

        {/* Center column (card width) */}
        <div className="relative z-10 w-full max-w-md space-y-4">
          {/* Loading skeleton */}
          {loading && (
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-6 shadow-2xl">
              <div className="animate-pulse space-y-4">
                <div className="aspect-[4/3] w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />
                <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-10 w-40 rounded bg-gray-200 dark:bg-zinc-800" />
              </div>
            </div>
          )}

          {/* Error card */}
          {!loading && err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-6 shadow-2xl">
              {err}
            </div>
          )}

          {/* Memory card */}
          {!loading && !err && <MemoryPopup memory={memory || undefined} />}

          {/* Voice note controls (kept functionality, styled as a card) */}
          {!loading && !err && (
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-2xl space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={checkAndPlayVoiceNote}
                  disabled={!memory?.id || vnLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  {vnLoading ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>▶️ Play voice note</>
                  )}
                </button>

                {personLabel && (
                  <div className="text-sm text-gray-700 dark:text-zinc-300 truncate">
                    Playing voice note{personLabel ? ` from ${personLabel}` : ""}.
                  </div>
                )}
              </div>

              {vnMsg && <div className="text-xs text-gray-600 dark:text-zinc-400">{vnMsg}</div>}

              <audio ref={audioRef} controls className="w-full" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
