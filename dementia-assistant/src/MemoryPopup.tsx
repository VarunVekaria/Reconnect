"use client";
import { useState } from "react";

type WaInvite = {
  name: string;
  relation?: string;
  phone: string;
  waLink: string;
  token: string;
  expiresAt: string;
};

export default function MemoryPopup({ memory }: { memory?: any }) {
  const [invites, setInvites] = useState<WaInvite[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function buildWaLinks() {
    if (!memory?.id) return;
    setLoading(true);
    try {
      const r = await fetch("/api/memory/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId: memory.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to prepare WhatsApp links");
      setInvites(j.links || []);
    } catch (e) {
      console.error(e);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  // Handle "no memory yet"
  if (!memory) {
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-600">
        No memory selected yet.
      </div>
    );
  }

  const storagePath = memory?.storagePath || "/placeholder.png";
  const title =
    (memory?.event ?? "Memory") +
    (memory?.eventDate ? ` • ${memory.eventDate}` : "");
  const people =
    (memory?.people ?? [])
      .map((p: any) => (p?.relation ? `${p.name} (${p.relation})` : p?.name))
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="rounded-xl border p-4">
      {/* image + details */}
      <img
        src={storagePath}
        alt={memory?.event || "Memory"}
        className="max-w-[320px] max-h-[320px] object-cover rounded-lg border"
      />

      <div className="mt-2 text-sm">
        <div className="font-medium">{title}</div>
        <div className="opacity-70">{people}</div>
      </div>

      {/* Build links */}
      <button
        onClick={buildWaLinks}
        disabled={loading}
        className="mt-3 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
      >
        {loading ? "Preparing…" : "Invite via WhatsApp"}
      </button>

      {/* Render wa.me buttons */}
      {invites && (
        <div className="mt-3 space-y-2">
          {invites.length === 0 && (
            <div className="text-xs text-gray-600">No valid phone numbers.</div>
          )}
          {invites.map((i) => (
            <div
              key={i.token}
              className="flex items-center justify-between gap-2"
            >
              <div className="text-sm">
                <div className="font-medium">
                  {i.name}
                  {i.relation ? ` (${i.relation})` : ""}
                </div>
                <div className="text-xs opacity-70">
                  expires {new Date(i.expiresAt).toLocaleString()}
                </div>
              </div>
              <a
                href={i.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-green-600 text-white text-xs"
              >
                Open WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
