// src/app/memorypop/MemoryPopup.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

type WaInvite = {
  name: string;
  relation?: string;
  phone: string;
  waLink: string;
  token: string;
  expiresAt?: string;
};

type Memory = {
  id?: string;
  storagePath?: string;
  event?: string;
  eventDate?: string;
  place?: string;
  caption?: string;
  people?: Array<{ name?: string; relation?: string }>;
};

export default function MemoryPopup({ memory }: { memory?: Memory }) {
  // ------- state (same behavior) -------
  const [invites, setInvites] = useState<WaInvite[] | null>(null);
  const [loading, setLoading] = useState(false);

  // ------- safe computed values (same robustness) -------
  const storagePath = useMemo(
    () =>
      memory?.storagePath && typeof memory.storagePath === "string"
        ? memory.storagePath
        : "/placeholder.png",
    [memory?.storagePath]
  );

  const title = useMemo(() => {
    const ev =
      typeof memory?.event === "string" && memory.event.trim()
        ? memory.event.trim()
        : "Memory";
    return ev;
  }, [memory?.event]);

  const subtitle = useMemo(() => {
    const pieces: string[] = [];
    if (typeof memory?.eventDate === "string" && memory.eventDate.trim()) {
      const d = new Date(memory.eventDate);
      pieces.push(isNaN(+d) ? memory!.eventDate!.trim() : d.toLocaleDateString());
    }
    if (typeof (memory as any)?.place === "string" && (memory as any).place.trim()) {
      pieces.push((memory as any).place.trim());
    }
    return pieces.join(" • ");
  }, [memory?.eventDate, (memory as any)?.place]);

  const peopleChips = useMemo(() => {
    const list = Array.isArray(memory?.people) ? memory!.people! : [];
    return list
      .map((p) => {
        const n = (p?.name ?? "").toString().trim();
        const r = (p?.relation ?? "").toString().trim();
        if (!n) return null;
        return r ? `${n} • ${r}` : n;
      })
      .filter(Boolean) as string[];
  }, [memory?.people]);

  // ------- action (same API & error handling) -------
  const buildWaLinks = useCallback(async () => {
    if (!memory?.id) return;
    setLoading(true);
    try {
      const r = await fetch("/api/memory/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId: memory.id }),
      });

      const ct = r.headers.get("content-type") || "";
      const j = ct.includes("application/json") ? await r.json() : {};
      if (!r.ok) throw new Error((j as any)?.error || `Failed (${r.status})`);

      setInvites(Array.isArray((j as any).links) ? ((j as any).links as WaInvite[]) : []);
    } catch (e) {
      console.error("Invite error:", e);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [memory?.id]);

  // ------- empty state (keeps “no memory” logic) -------
  if (!memory?.id) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Latest Memory</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
          No memory selected yet.
        </p>
      </div>
    );
  }

  // ------- UI card (adopts the vertical style) -------
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 shadow-2xl overflow-hidden">
      <div className="p-5 md:p-6">
        {/* Image on top */}
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800">
          <img
            src={storagePath}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
            }}
          />
        </div>

        {/* Title & subtitle */}
        <div className="mt-4 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* People chips */}
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

        {/* Caption (optional) */}
        {typeof memory?.caption === "string" && memory.caption.trim() && (
          <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
            {memory.caption}
          </p>
        )}

        {/* Primary action */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={buildWaLinks}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm disabled:opacity-50"
            type="button"
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
          <span className="text-xs text-gray-500" />
        </div>

        {/* Invites list (keeps original safety & behavior) */}
        {Array.isArray(invites) && (
          <div className="mt-5 rounded-lg border border-gray-200 dark:border-zinc-800 divide-y dark:divide-zinc-800">
            {invites.length === 0 && (
              <div className="p-3 text-xs text-gray-500">
                No valid phone numbers found for this memory.
              </div>
            )}

            {invites.map((i, idx) => {
              const exp =
                i?.expiresAt && !Number.isNaN(new Date(i.expiresAt).getTime())
                  ? new Date(i.expiresAt).toLocaleString()
                  : null;
              const label = [i?.name?.trim(), i?.relation?.trim() ? `(${i.relation!.trim()})` : ""]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={i?.token || `invite-${idx}`} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {label || "Contact"}
                    </div>
                    {exp && <div className="text-xs text-gray-500">Expires {exp}</div>}
                  </div>
                  {i?.waLink ? (
                    <a
                      href={i.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs"
                    >
                      Open WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">No link</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
