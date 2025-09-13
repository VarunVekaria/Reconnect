"use client";

import { useEffect, useMemo, useState } from "react";

/** Types kept inline for simplicity */
type Coords = { lat?: number; lng?: number };
type Place = { label?: string; coords?: Coords };
type ScheduleItem = {
  id?: string;
  title: string;
  instructions?: string;
  dow: number[];          // 1..7 (Mon..Sun)
  start: string;          // "HH:mm"
  end?: string;
  location?: Place;
};

/** UI helpers */
const DOW_LABELS: Record<number, string> = {
  1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun",
};
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [6, 7];
const EVERYDAY = [1, 2, 3, 4, 5, 6, 7];

const initialForm: ScheduleItem = {
  title: "",
  instructions: "",
  dow: EVERYDAY,
  start: "08:00",
  end: "",
  location: undefined,
};

export default function ScheduleEditor({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleItem>(initialForm);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ---- nested-update helpers ----
  function updateLocation(patch: Partial<Place>) {
    setForm((f) => ({ ...f, location: { ...(f.location ?? {}), ...patch } }));
  }
  function updateCoords(patch: Partial<Coords>) {
    setForm((f) => ({
      ...f,
      location: { ...(f.location ?? {}), coords: { ...(f.location?.coords ?? {}), ...patch } },
    }));
  }
  const toNum = (v: string) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

  // ---- load list ----
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?patientId=${patientId}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ---- validation ----
  function validate(s: ScheduleItem): string[] {
    const errs: string[] = [];
    if (!s.title.trim()) errs.push("Please add a title.");
    if (!/^\d{2}:\d{2}$/.test(s.start)) errs.push("Start time must be HH:mm.");
    if (s.end && !/^\d{2}:\d{2}$/.test(s.end)) errs.push("End time must be HH:mm.");
    if (!s.dow?.length) errs.push("Pick at least one day.");
    if (s.location?.coords) {
      const { lat, lng } = s.location.coords;
      if (lat !== undefined && (lat < -90 || lat > 90)) errs.push("Latitude must be between -90 and 90.");
      if (lng !== undefined && (lng < -180 || lng > 180)) errs.push("Longitude must be between -180 and 180.");
    }
    return errs;
  }

  // ---- add item ----
  async function addItem() {
    const errs = validate(form);
    if (errs.length) {
      setMsg({ kind: "err", text: errs[0] });
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, item: form }),
      });
      setForm(initialForm);
      setMsg({ kind: "ok", text: "Added to schedule." });
      await load();
    } catch {
      setMsg({ kind: "err", text: "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // ---- single delete: remove entire task by id ----
  async function removeItem(id?: string) {
    if (!id) return;
    setDeletingId(id);
    try {
      const qs = new URLSearchParams({ patientId, id });
      await fetch(`/api/schedule?${qs.toString()}`, {
        method: "DELETE",
        // no body on DELETE → use query params
      });
      setMsg({ kind: "ok", text: "Removed." });
      await load();
    } catch {
      setMsg({ kind: "err", text: "Could not remove item." });
    } finally {
      setDeletingId(null);
    }
  }

  // ---- toggle DOW in the form ----
  function toggleDay(d: number) {
    setForm((f) => {
      const has = f.dow.includes(d);
      return { ...f, dow: has ? f.dow.filter((x) => x !== d) : [...f.dow, d].sort((a, b) => a - b) };
    });
  }

  // ---- sort/group for display ----
  const grouped = useMemo(() => {
    const byDay: Record<number, ScheduleItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const it of items) {
      (it.dow ?? []).forEach((d) => byDay[d].push(it));
    }
    for (const d of Object.keys(byDay)) {
      byDay[+d].sort((a, b) => a.start.localeCompare(b.start));
    }
    return byDay;
  }, [items]);

  // ---- UI ----
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Schedule</h2>

      {/* toast */}
      {msg && (
        <div
          className={`text-sm rounded-md px-3 py-2 ${
            msg.kind === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          onAnimationEnd={() => setTimeout(() => setMsg(null), 2200)}
        >
          {msg.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: create */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 space-y-4 shadow-sm">
          <h3 className="font-medium">Create a schedule item</h3>

          <div className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-gray-600">Title*</span>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                placeholder="e.g., Breakfast"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-gray-600">Instructions</span>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                placeholder="e.g., Oatmeal and tea"
                value={form.instructions ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-gray-600">Start*</span>
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-gray-600">End</span>
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                  value={form.end ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                />
              </label>
            </div>

            {/* DOW chips */}
            <div className="text-sm">
              <div className="mb-2 text-gray-600">Days of week*</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DOW_LABELS).map(([n, label]) => {
                  const num = Number(n);
                  const active = form.dow.includes(num);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleDay(num)}
                      className={`px-3 py-1.5 rounded-full border text-sm ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-200"
                      }`}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-xs rounded-full border px-2 py-1"
                  onClick={() => setForm((f) => ({ ...f, dow: EVERYDAY }))}
                >
                  Every day
                </button>
                <button
                  type="button"
                  className="text-xs rounded-full border px-2 py-1"
                  onClick={() => setForm((f) => ({ ...f, dow: WEEKDAYS }))}
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  className="text-xs rounded-full border px-2 py-1"
                  onClick={() => setForm((f) => ({ ...f, dow: WEEKENDS }))}
                >
                  Weekends
                </button>
              </div>
            </div>

            {/* Location */}
            <div className="text-sm space-y-3 pt-1">
              <div className="text-gray-600">Location (optional)</div>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                placeholder="Label (e.g., Home, Clinic)"
                value={form.location?.label ?? ""}
                onChange={(e) => updateLocation({ label: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                  placeholder="Latitude"
                  value={form.location?.coords?.lat ?? ""}
                  onChange={(e) => {
                    const lat = toNum(e.target.value);
                    updateCoords(lat === undefined ? {} : { lat });
                  }}
                />
                <input
                  type="number"
                  step="any"
                  className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                  placeholder="Longitude"
                  value={form.location?.coords?.lng ?? ""}
                  onChange={(e) => {
                    const lng = toNum(e.target.value);
                    updateCoords(lng === undefined ? {} : { lng });
                  }}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={addItem}
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add to schedule"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: list */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Upcoming items</h3>
            <button
              onClick={load}
              disabled={loading}
              className="text-sm rounded border px-3 py-1 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {items.length === 0 && !loading && (
            <div className="text-sm text-gray-500">No items yet. Add something on the left.</div>
          )}

          <div className="space-y-5">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((d) => {
              // group and render per day for easy reading
              const dayItems = grouped[d];
              if (!dayItems?.length) return null;
              return (
                <div key={d} className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-gray-500">{DOW_LABELS[d]}</div>
                  <ul className="divide-y rounded border">
                    {dayItems.map((it, idx) => {
                      const deleting = deletingId === it.id;
                      return (
                        <li key={(it.id ?? "") + idx} className="p-3 flex items-start justify-between">
                          <div className="pr-3">
                            <div className="font-medium">
                              {it.title}{" "}
                              <span className="text-xs text-gray-500">
                                ({it.start}{it.end ? `–${it.end}` : ""})
                              </span>
                            </div>
                            {it.instructions && (
                              <div className="text-sm text-gray-600 dark:text-zinc-300">{it.instructions}</div>
                            )}
                            {it.location && (it.location.label || it.location.coords) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {it.location.label ? <span>{it.location.label}</span> : <span>Point</span>}
                                {it.location.coords && (
                                  <span> — [{it.location.coords.lat}, {it.location.coords.lng}]</span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(it.id)}   // single delete → remove entire task
                            disabled={deleting}
                            className="text-red-600 text-sm hover:underline disabled:opacity-50"
                            title="Delete task"
                          >
                            {deleting ? "Removing…" : "Delete"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
