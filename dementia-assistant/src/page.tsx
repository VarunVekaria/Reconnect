// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import MemoryPopup from "./MemoryPopup"; // <-- adjust path if you moved the component

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

  // Set your active patient id here (or pull from auth/session)
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
        });
        const data = await res.json();

        const items: MemoryItem[] = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) {
          if (!cancelled) {
            setMemory(null);
          }
          return;
        }

        // Prefer only real "memory" entries (exclude "person")
        const memories = items.filter((m) => m?.type === "memory");

        // Sort newest-first by createdAt; fallback to eventDate if createdAt is missing;
        // final fallback = stable by id.
        const sorted = (memories.length ? memories : items).slice().sort((a, b) => {
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

          // last resort stable fallback
          return String(b.id).localeCompare(String(a.id));
        });

        if (!cancelled) {
          setMemory(sorted[0] || null);
        }
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

  const header = useMemo(
    () => (
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Patient Profile</h1>
        <p className="text-sm text-gray-500">Auto-selected latest memory</p>
      </div>
    ),
    []
  );

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
        <div className="rounded-xl border p-4 text-sm text-red-600">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {header}
      <MemoryPopup memory={memory || undefined} />
    </div>
  );
}
