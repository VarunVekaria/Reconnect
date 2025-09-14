// src/app/MemoryPopup.tsx
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
  people?: Array<{ name?: string; relation?: string }>;
};

export default function MemoryPopup({ memory }: { memory?: Memory }) {
  const [invites, setInvites] = useState<WaInvite[] | null>(null);
  const [loading, setLoading] = useState(false);

  const storagePath = useMemo(
    () => (memory?.storagePath && typeof memory.storagePath === "string" ? memory.storagePath : "/placeholder.png"),
    [memory?.storagePath]
  );

  const title = useMemo(() => {
    const event = typeof memory?.event === "string" && memory.event.trim() ? memory.event.trim() : "Memory";
    const date  = typeof memory?.eventDate === "string" && memory.eventDate.trim() ? ` • ${memory.eventDate}` : "";
    return `${event}${date}`;
  }, [memory?.event, memory?.eventDate]);

  const peopleText = useMemo(() => {
    const list = Array.isArray(memory?.people) ? memory!.people! : [];
    if (!list.length) return "—";
    return list
      .map((p) => {
        const name = (p?.name ?? "").toString().trim();
        const rel  = (p?.relation ?? "").toString().trim();
        if (!name) return null;
        return rel ? `${name} (${rel})` : name;
      })
      .filter(Boolean)
      .join(", ");
  }, [memory?.people]);

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
      setInvites(Array.isArray((j as any).links) ? (j as any).links : []);
    } catch (e) {
      console.error("Invite error:", e);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [memory?.id]);

  // Graceful "no memory" box that will NOT block siblings
  if (!memory?.id) {
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-600 bg-white/60">
        No memory selected yet.
      </div>
    );
  }

  return (
    <section className="rounded-xl border p-4 bg-white/60 space-y-3">
      {/* Image + details */}
      <div className="flex items-start gap-3">
        <img
          src={storagePath}
          alt={memory?.event || "Memory"}
          className="block w-[320px] h-[320px] object-cover rounded-lg border flex-shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-sm opacity-70 break-words">{peopleText}</div>

          <button
            onClick={buildWaLinks}
            disabled={loading}
            className="mt-3 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
            type="button"
          >
            {loading ? "Preparing…" : "Invite via WhatsApp"}
          </button>
        </div>
      </div>

      {/* Render wa.me buttons (never throws if fields are missing) */}
      {Array.isArray(invites) && (
        <div className="mt-2 space-y-2">
          {invites.length === 0 && (
            <div className="text-xs text-gray-600">No valid phone numbers.</div>
          )}
          {invites.map((i, idx) => {
            const exp =
              i?.expiresAt && !Number.isNaN(new Date(i.expiresAt).getTime())
                ? new Date(i.expiresAt).toLocaleString()
                : null;
            const label =
              [i?.name?.trim(), i?.relation?.trim() ? `(${i.relation!.trim()})` : ""]
                .filter(Boolean)
                .join(" ");

            return (
              <div key={i?.token || `invite-${idx}`} className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <div className="font-medium">{label || "Contact"}</div>
                  {exp && <div className="text-xs opacity-70">expires {exp}</div>}
                </div>
                {i?.waLink ? (
                  <a
                    href={i.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-green-600 text-white text-xs"
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
    </section>
  );
}
