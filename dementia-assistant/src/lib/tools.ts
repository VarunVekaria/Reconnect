// src/lib/tools.ts
import { ScheduleItem, PatientContext } from "./types";
import scheduleData from "../data/schedule.json";
import contextData  from "../data/context.json";
import { listByPatient } from "./db";
import type { MemoryItem } from "./memoryTypes";

type ScheduleDB = Record<string, ScheduleItem[]>;
type ContextDB  = Record<string, PatientContext>;

const SCHEDULE = scheduleData as ScheduleDB;
const CONTEXT  = contextData as ContextDB;

/** --- Local time helpers --- */
function nowDate(): Date { return new Date(); }
function hhmm(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function isoWeekday(d: Date): number {
  const js = d.getDay(); // 0..6 (Sun..Sat)
  return js === 0 ? 7 : js;
}
function timeLE(a: string, b: string) { return a <= b; }
function timeGE(a: string, b: string) { return a >= b; }

/** next occurrence of DOW+time from base */
function nextOccurrence(base: Date, targetDow: number, hhmmStr: string): Date {
  const b = new Date(base.getTime());
  const currentDow = isoWeekday(b);
  let daysToAdd = (targetDow - currentDow + 7) % 7;

  const [hh, mm] = hhmmStr.split(":").map(Number);
  const candidate = new Date(b.getFullYear(), b.getMonth(), b.getDate() + daysToAdd, hh, mm, 0, 0);
  if (daysToAdd === 0 && candidate.getTime() <= b.getTime()) candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

/** Google Maps link builder */
function mapUrlForPlace(p?: { coords?: { lat: number; lng: number }, label?: string }) {
  if (p?.coords?.lat != null && p?.coords?.lng != null) {
    const label = encodeURIComponent(p.label ?? "Destination");
    return `https://www.google.com/maps/dir/?api=1&destination=${p.coords.lat},${p.coords.lng}&travelmode=walking&dir_action=navigate&destination_name=${label}`;
  }
  return undefined;
}

/** -------- Existing tools -------- */
export async function getCurrentSchedule(patientId: string) {
  const list = (SCHEDULE[patientId] || []) as ScheduleItem[];

  const now = nowDate();
  const dow = isoWeekday(now);
  const current = hhmm(now);

  // active now
  const active = list
    .filter(i => i.dow.includes(dow))
    .filter(i => {
      if (!i.end) return timeGE(current, i.start);
      return timeGE(current, i.start) && timeLE(current, i.end);
    })
    .sort((a,b) => a.start.localeCompare(b.start));

  if (active[0]) return { mode: "now", item: active[0] };

  // next within 7 days
  let best: { item: ScheduleItem; when: Date } | null = null;
  for (const item of list) {
    for (const d of item.dow) {
      const when = nextOccurrence(now, d, item.start);
      if (!best || when < best.when) best = { item, when };
    }
  }
  if (best) return { mode: "next", item: best.item, whenISO: best.when.toISOString() };

  return { mode: "none", item: null };
}

export async function retrieveContext(patientId: string) {
  return (CONTEXT[patientId] || {}) as PatientContext;
}

/** -------- New tools -------- */

/** Picks a navigation target from current/next schedule item, else home. */
export async function getNavigationTarget(patientId: string) {
  const context = await retrieveContext(patientId);
  const sch = await getCurrentSchedule(patientId);

  // Prefer current item location if present, else next's, else home
  const candidatePlace =
    (sch.mode === "now" && sch.item?.location) ||
    (sch.mode === "next" && sch.item?.location) ||
    context.home;

  const url = mapUrlForPlace(candidatePlace);
  return {
    found: Boolean(url),
    label: candidatePlace?.label || (sch.item?.title ?? context.home?.label ?? "Destination"),
    mapUrl: url
  };
}

/** Sends an emergency alert (stub: logs). Plug SMS/Email providers later. */
export async function sendEmergencyAlert(patientId: string, location?: { lat?: number; lng?: number }) {
  const ctx = await retrieveContext(patientId);
  const contacts = ctx.emergencyContacts || [];
  const payload = {
    patientId,
    when: new Date().toISOString(),
    location: location ?? null,
    notify: contacts.map(c => ({ name: c.name, phone: c.phone, email: c.email }))
  };

  // 🔔 Stub delivery: log. Replace with Twilio/Resend integrations later.
  console.log("EMERGENCY ALERT:", JSON.stringify(payload, null, 2));

  return {
    notified: contacts.length > 0,
    contactsCount: contacts.length
  };
}

/** -------- Memories by date (for "what happened on this day?" queries) -------- */

type MemorySummary = {
  id: string;
  event?: string;
  eventDate?: string;   // YYYY-MM-DD
  place?: string;
  people: { name: string; relation?: string }[];
  caption?: string;
  storagePath: string;  // public path like "/memory/<uuid>.jpg"
};

/** Normalize natural/explicit date text into ISO (YYYY-MM-DD) and month-day (MM-DD). */
function normalizeDate(query?: string): { iso?: string; md?: string } {
  const now = new Date();
  const text = (query || "").trim().toLowerCase();

  // no text or generic "today/this day"
  if (!text || ["today", "now", "this day", "thisday", "what happened on this day"].includes(text)) {
    const iso = now.toISOString().slice(0, 10);
    const md = iso.slice(5); // "MM-DD"
    return { iso, md };
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const m1 = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    const [_, y, mo, d] = m1;
    const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { iso, md: iso.slice(5) };
  }

  // Try "7 june", "07 jun", "june 7", "jun 7 2021" (we ignore provided year in this branch)
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const m2 = text.match(/\b(\d{1,2})\s*([a-z]{3,})\b|\b([a-z]{3,})\s*(\d{1,2})\b/);
  if (m2) {
    let day: string | null = null, mon: string | null = null;

    if (m2[1] && m2[2]) { day = m2[1]; mon = m2[2]; }
    else if (m2[3] && m2[4]) { mon = m2[3]; day = m2[4]; }

    const idx = months.findIndex(m => mon!.startsWith(m));
    if (idx >= 0 && day) {
      const mm = String(idx + 1).padStart(2, "0");
      const dd = String(Number(day)).padStart(2, "0");
      const yy = String(now.getFullYear()); // default to current year
      const iso = `${yy}-${mm}-${dd}`;
      return { iso, md: `${mm}-${dd}` };
    }
  }

  // Fallback: could not parse
  return {};
}

/**
 * Fetch memory-book photos/details for a given date phrase:
 * - Matches only items with type === "memory" and an eventDate string.
 * - Prefers exact YYYY-MM-DD match; if none, falls back to same month-day.
 * - Returns newest-first list of compact summaries for chat rendering.
 */
export async function getMemoriesByDate(patientId: string, dateQuery?: string): Promise<MemorySummary[]> {
  const { iso, md } = normalizeDate(dateQuery);
  const items = await listByPatient(patientId);

  const memories = (items as MemoryItem[]).filter(
    it => it.type === "memory" && typeof it.eventDate === "string"
  );

  let matches: MemoryItem[] = [];
  if (iso) {
    matches = memories.filter(m => m.eventDate === iso);
  }
  // If no exact YYYY-MM-DD match, try month-day match (MM-DD)
  if (matches.length === 0 && md) {
    matches = memories.filter(m => (m.eventDate || "").slice(5) === md);
  }

  // Sort newest first
  matches.sort((a, b) => (a.eventDate! < b.eventDate! ? 1 : -1));

  // Map to compact summaries for the chat layer
  return matches.map(m => ({
    id: m.id,
    event: m.event || "Memory",
    eventDate: m.eventDate,
    place: m.place,
    people: m.people || [],
    caption: m.caption,
    storagePath: m.storagePath
  }));
}
