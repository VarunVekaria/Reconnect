import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "../../../lib/fsjson";

type LogEntry = {
  ts: string;
  patientId: string;
  type: "chat" | "tool" | "emergency" | "nav";
  text?: string;           // user or assistant message (optional)
  meta?: any;              // tool result etc
  // NEW fields for medical tagging
  tags?: string[];
  severity?: "low" | "moderate" | "urgent";
  categories?: string[];
  reasons?: string;
};

const FILE = "logs.json";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  const medicalOnly = req.nextUrl.searchParams.get("medicalOnly") === "1"; // <-- NEW

  const logs = await readJSON<LogEntry[]>(FILE, []);

  let filtered = patientId ? logs.filter(l => l.patientId === patientId) : logs;

  // filter for doctor view
  if (medicalOnly) {
    filtered = filtered.filter(l => Array.isArray(l.tags) && l.tags.includes("medical"));
  }

  // sort: severity first (urgent → moderate → low), then newest first
  const severityRank = { urgent: 0, moderate: 1, low: 2 } as const;
  filtered.sort((a, b) => {
    const sa = severityRank[a.severity ?? "low"];
    const sb = severityRank[b.severity ?? "low"];
    if (sa !== sb) return sa - sb;
    return a.ts < b.ts ? 1 : -1;
  });

  return NextResponse.json({ logs: filtered.slice(0, 200) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as LogEntry;
  if (!body?.patientId || !body?.type) {
    return NextResponse.json({ error: "patientId & type required" }, { status: 400 });
  }

  const logs = await readJSON<LogEntry[]>(FILE, []);
  logs.push({ ...body, ts: body.ts ?? new Date().toISOString() });
  await writeJSON(FILE, logs);
  return NextResponse.json({ ok: true });
}
