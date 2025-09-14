"use client";

import { useEffect, useState } from "react";
import MemoryPopup from "./MemoryPopup";

type Person = { name: string; relation?: string; contactNumber?: string };
type MemoryItem = {
  id: string;
  patientId: string;
  storagePath: string;
  event?: string;
  eventDate?: string;   // YYYY-MM-DD
  place?: string;
  people?: Person[];
  createdAt?: string;   // ISO
  type?: "memory" | "person";
};

export default function Page() {
  const [memory, setMemory] = useState<MemoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const patientId = "patient123";

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/memory/list?patientId=${encodeURIComponent(patientId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const data = await res.json();
        const items: MemoryItem[] = Array.isArray(data?.items) ? data.items : [];
        const memories = items.filter((m) => m?.type === "memory");
        const sorted = (memories.length ? memories : items).slice().sort((a, b) => {
          const ac = a.createdAt ? Date.parse(a.createdAt) : NaN;
          const bc = b.createdAt ? Date.parse(b.createdAt) : NaN;
          if (!Number.isNaN(ac) && !Number.isNaN(bc) && ac !== bc) return bc - ac;
          const ae = a.eventDate ? Date.parse(a.eventDate) : NaN;
          const be = b.eventDate ? Date.parse(b.eventDate) : NaN;
          if (!Number.isNaN(ae) && !Number.isNaN(be) && ae !== be) return be - ae;
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

  // Fullscreen backdrop + centered content
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

        {/* Modal body */}
        <div className="relative z-10 w-full max-w-md">
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

          {!loading && err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-6 shadow-2xl">
              {err}
            </div>
          )}

          {!loading && !err && (
            <MemoryPopup memory={memory || undefined} />
          )}
        </div>
      </div>
    </main>
  );
}
