import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "../../../lib/fsjson";

type ScheduleItem = {
  id?: string;
  title: string;
  instructions?: string;
  dow: number[];            // 1..7
  start: string;            // "HH:mm"
  end?: string;
  location?: { label?: string; coords?: { lat?: number; lng?: number } };
};

type ScheduleDB = Record<string, ScheduleItem[]>;

const FILE = "schedule.json";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const db = await readJSON<ScheduleDB>(FILE, {});
  const list = db[patientId] ?? [];

  // --- MIGRATION: ensure all items have an id ---
  let changed = false;
  for (const it of list) {
    if (!it.id) {
      it.id = uid();
      changed = true;
    }
  }
  if (changed) {
    db[patientId] = list;
    await writeJSON(FILE, db);
  }
  // ---------------------------------------------

  return NextResponse.json({ items: list });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    patientId: string;
    item: ScheduleItem;
  } | null;

  if (!body?.patientId || !body?.item) {
    return NextResponse.json({ error: "patientId & item required" }, { status: 400 });
  }

  const db = await readJSON<ScheduleDB>(FILE, {});
  const list = db[body.patientId] ?? [];
  const item = { ...body.item, id: body.item.id ?? uid() };
  db[body.patientId] = [...list, item];

  await writeJSON(FILE, db);
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    patientId: string;
    item: ScheduleItem;
  } | null;

  if (!body?.patientId || !body?.item?.id) {
    return NextResponse.json({ error: "patientId & item.id required" }, { status: 400 });
  }

  const db = await readJSON<ScheduleDB>(FILE, {});
  const list = db[body.patientId] ?? [];
  const idx = list.findIndex((i) => i.id === body.item.id);
  if (idx === -1) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  list[idx] = { ...list[idx], ...body.item };
  db[body.patientId] = list;
  await writeJSON(FILE, db);

  return NextResponse.json({ ok: true, item: list[idx] });
}

/**
 * DELETE — single-button behavior:
 * Removes the entire task (all days) by id.
 * Read parameters from the URL query string (reliable for DELETE).
 * Required: ?patientId=...&id=...
 */
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") || undefined;
  const id = url.searchParams.get("id") || undefined;

  if (!patientId || !id) {
    return NextResponse.json({ error: "patientId & id required" }, { status: 400 });
  }

  const db = await readJSON<ScheduleDB>(FILE, {});
  const list = db[patientId] ?? [];
  const next = list.filter((i) => i.id !== id);

  db[patientId] = next;
  await writeJSON(FILE, db);

  return NextResponse.json({ ok: true, removed: true });
}
