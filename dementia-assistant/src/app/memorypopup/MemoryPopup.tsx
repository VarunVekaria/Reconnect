"use client";
import { useMemo, useState } from "react";

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

  const peopleChips: string[] = useMemo(
    () =>
      (memory?.people ?? [])
        .map((p: any) => (p?.relation ? `${p.name} • ${p.relation}` : p?.name))
        .filter(Boolean),
    [memory]
  );

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

  // Empty state (still uses the modal card shell)
  if (!memory) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Latest Memory</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
          No memory selected yet.
        </p>
      </div>
    );
  }

  const storagePath = memory?.storagePath || "/placeholder.png";
  const title = memory?.event || "Memory";
  const subtitlePieces = [
    memory?.eventDate ? new Date(memory.eventDate).toLocaleDateString() : null,
    memory?.place || null,
  ].filter(Boolean);
  const subtitle = subtitlePieces.join(" • ");

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 shadow-2xl overflow-hidden">
      {/* Card content — vertical stack */}
      <div className="p-5 md:p-6">
        {/* Image on top */}
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800">
          <img
            src={storagePath}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Details below image */}
        <div className="mt-4 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* People */}
        <div className="mt-4 flex flex-wrap gap-2">
          {peopleChips.length > 0 ? (
            peopleChips.map((txt, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                {txt}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500">No people listed</span>
          )}
        </div>

        {/* Caption */}
        {memory?.caption && (
          <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
            {memory.caption}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={buildWaLinks}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                Preparing…
              </>
            ) : (
              <>Reconnect with them!</>
            )}
          </button>
          <span className="text-xs text-gray-500">
            
          </span>
        </div>

        {/* Invites */}
        {invites && (
          <div className="mt-5 rounded-lg border border-gray-200 dark:border-zinc-800 divide-y dark:divide-zinc-800">
            {invites.length === 0 && (
              <div className="p-3 text-xs text-gray-500">
                No valid phone numbers found for this memory.
              </div>
            )}
            {invites.map((i) => (
              <div
                key={i.token}
                className="p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {i.name}{i.relation ? ` (${i.relation})` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Expires {new Date(i.expiresAt).toLocaleString()}
                  </div>
                </div>
                <a
                  href={i.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs"
                >
                  Open WhatsApp
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
