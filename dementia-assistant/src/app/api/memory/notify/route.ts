// src/app/api/memory/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/lib/fsjson";
import type { MemoryDB, MemoryItem } from "@/lib/memoryTypes";
import { createToken } from "@/lib/notify";

export const runtime = "nodejs";

function baseUrlFromReq(req: NextRequest) {
  const hdrHost = req.headers.get("host"); // e.g. "localhost:3000" or "127.0.0.1:3001"
  if (hdrHost) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${hdrHost}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
}

// digits only, add country code if you want e.g. default "+1"
function normalizeForWa(num: string): string {
  // strip non-digits
  const digits = (num || "").replace(/\D+/g, "");
  return digits; // wa.me expects digits only, with country code included
}

function buildWaLink(number: string, text: string) {
  const n = normalizeForWa(number);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { memoryId } = await req.json();
    if (!memoryId) {
      return NextResponse.json({ error: "memoryId required" }, { status: 400 });
    }

    const db = await readJSON<MemoryDB>("memory.json", {});
    const all = Object.values(db).flat() as MemoryItem[];
    const item = all.find((m) => m.id === memoryId);
    if (!item) return NextResponse.json({ error: "memory not found" }, { status: 404 });

    const patientId = item.patientId;
    const people = (item.people || []).filter((p: any) => p?.contactNumber && p.contactNumber.trim());

    if (!people.length) {
      return NextResponse.json({
        ok: false,
        sent: 0,
        links: [],
        reason: "No phone numbers on this memory",
      });
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

    const links = [];
    for (const p of people) {
      const phone = String((p as any).contactNumber || "").trim();
      if (!phone) continue;

      const token = await createToken({
        memoryId: item.id,
        patientId,
        personName: p.name,
        phone,
        expiresAt,
      });

      

      const link = `${baseUrlFromReq(req)}/voice/${token}`;
      const eventStr =
        (item.event?.trim() || "this day") + (item.eventDate ? ` (${item.eventDate})` : "");
      const msg =
        `Hi ${p.name}!` +
        `\nPlease leave a short voice note for ${eventStr}.` +
        `\nUpload here: ${link}`;

      const waLink = buildWaLink(phone, msg);
      links.push({
        name: p.name,
        relation: p.relation,
        phone,
        waLink,
        token,
        expiresAt,
      });
    }

    return NextResponse.json({ ok: true, sent: links.length, links });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "notify failed" }, { status: 500 });
  }
}
