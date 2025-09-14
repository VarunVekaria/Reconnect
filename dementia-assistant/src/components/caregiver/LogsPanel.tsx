"use client";
import { useEffect, useMemo, useState } from "react";

type LogEntry = {
  ts: string;
  patientId: string;
  type: "chat" | "tool" | "emergency" | "nav";
  text?: string;
  meta?: any;

  // optional medical tagging
  tags?: string[];
  severity?: "low" | "moderate" | "urgent";
  categories?: string[];
  reasons?: string;
};

export default function LogsPanel({
  patientId,
  medicalOnly = false,
}: {
  patientId: string;
  medicalOnly?: boolean;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(""); // tiny client-side search

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({
      patientId,
      ...(medicalOnly ? { medicalOnly: "1" } : {}),
    });
    const res = await fetch(`/api/logs?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, medicalOnly]);

  // ---- UI helpers ----------------------------------------------------------
  const chipForSeverity = (sev?: LogEntry["severity"]) => {
    const s = sev ?? "low";
    const base =
      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border";
    if (s === "urgent")
      return `${base} bg-red-50 text-red-700 border-red-200`;
    if (s === "moderate")
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  };

  const iconForType = (t: LogEntry["type"]) => {
    if (t === "emergency")
      return (
        <span className="text-red-600" title="Emergency">
          ⚠️
        </span>
      );
    if (t === "nav")
      return (
        <span className="text-blue-600" title="Navigation">
          🗺️
        </span>
      );
    if (t === "tool")
      return (
        <span className="text-purple-600" title="Tool">
          🧩
        </span>
      );
    return (
      <span className="text-gray-600" title="Chat">
        💬
      </span>
    );
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return logs;
    const needle = q.toLowerCase();
    return logs.filter((l) =>
      [
        l.text ?? "",
        ...(l.categories ?? []),
        l.reasons ?? "",
        l.type,
        l.severity ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [logs, q]);

  return (
    <section className="space-y-3">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 flex items-center gap-2 border-b">
        <h2 className="text-base font-semibold flex-1">
          {medicalOnly ? "Medical Logs" : "Patient Logs"}
        </h2>
        <div className="flex items-center gap-2">
          <input
            className="rounded-lg border px-2 py-1 text-sm bg-white dark:bg-zinc-900 w-48"
            placeholder="Search text or tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            onClick={load}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl border p-4 text-sm text-gray-500">
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border p-4 text-sm text-gray-500">
            No {medicalOnly ? "medical " : ""}logs found.
          </div>
        )}

        {filtered.map((l, i) => {
          const isMedical = l.tags?.includes("medical");
          return (
            <article
              key={i}
              className="rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* header row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    {iconForType(l.type)}
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200">
                      {l.type}
                    </span>
                  </span>
                  <span>•</span>
                  <time dateTime={l.ts}>
                    {new Date(l.ts).toLocaleString()}
                  </time>
                </div>

                <div className="flex items-center gap-1">
                  {isMedical && (
                    <span className={chipForSeverity(l.severity)}>
                      {l.severity ?? "low"} medical
                    </span>
                  )}
                  {Array.isArray(l.categories) &&
                    l.categories.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-gray-50 border text-gray-700"
                      >
                        {c}
                      </span>
                    ))}
                </div>
              </div>

              {/* body */}
              {l.text && (
                <p className="mt-2 text-sm leading-relaxed">{l.text}</p>
              )}

              {l.reasons && (
                <p className="mt-1 text-xs text-gray-500">{l.reasons}</p>
              )}

              {/* meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {l.meta?.mapUrl && (
                  <a
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    href={l.meta.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🗺️ Open map
                  </a>
                )}
                {l.meta?.emergencyNotified && (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    🚑 Emergency notified{" "}
                    <strong>({l.meta.contactsCount})</strong>
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
