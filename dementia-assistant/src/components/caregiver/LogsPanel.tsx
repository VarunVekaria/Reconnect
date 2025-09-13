"use client";
import { useEffect, useState } from "react";

type LogEntry = {
  ts: string;
  patientId: string;
  type: "chat" | "tool" | "emergency" | "nav";
  text?: string;
  meta?: any;

  // NEW optional fields for medical tagging
  tags?: string[];
  severity?: "low" | "moderate" | "urgent";
  categories?: string[];
  reasons?: string;
};

export default function LogsPanel({
  patientId,
  medicalOnly = false, // <-- NEW
}: {
  patientId: string;
  medicalOnly?: boolean;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

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
    // re-load when patient or filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, medicalOnly]);

  const chipForSeverity = (sev?: LogEntry["severity"]) => {
    const s = sev ?? "low";
    const base = "px-2 py-0.5 text-[10px] rounded";
    if (s === "urgent") return `${base} bg-red-100 text-red-700`;
    if (s === "moderate") return `${base} bg-yellow-100 text-yellow-700`;
    return `${base} bg-blue-100 text-blue-700`;
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold mb-3">
          {medicalOnly ? "Medical Logs" : "Patient Logs"}
        </h2>
        <button onClick={load} className="rounded border px-3 py-1 text-sm">
          Refresh
        </button>
      </div>

      <div className="rounded-lg border divide-y">
        {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
        {!loading && logs.length === 0 && (
          <div className="p-3 text-sm text-gray-500">No logs yet.</div>
        )}

        {logs.map((l, i) => (
          <div key={i} className="p-3 text-sm">
            {/* Top row: time + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs text-gray-500">
                {new Date(l.ts).toLocaleString()}
              </div>

              {/* Always show type pill */}
              <span className="px-2 py-0.5 text-[10px] rounded bg-gray-100">
                {l.type}
              </span>

              {/* Medical severity pill when applicable */}
              {l.tags?.includes("medical") && (
                <span className={chipForSeverity(l.severity)}>
                  {l.severity || "low"} medical
                </span>
              )}

              {/* Optional categories */}
              {Array.isArray(l.categories) && l.categories.length > 0 && (
                <span className="text-[10px] text-gray-500">
                  [{l.categories.join(", ")}]
                </span>
              )}
            </div>

            {/* Main line: text */}
            <div className="mt-1">{l.text}</div>

            {/* Optional reasons/explanation */}
            {l.reasons && (
              <div className="text-xs text-gray-500 mt-1">{l.reasons}</div>
            )}

            {/* Existing meta rendering */}
            {l.meta?.mapUrl && (
              <div className="text-xs mt-1">
                Map:{" "}
                <a
                  className="text-blue-600 underline"
                  href={l.meta.mapUrl}
                  target="_blank"
                >
                  Open
                </a>
              </div>
            )}
            {l.meta?.emergencyNotified && (
              <div className="text-xs mt-1 text-red-600">
                Emergency notified ({l.meta.contactsCount})
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
