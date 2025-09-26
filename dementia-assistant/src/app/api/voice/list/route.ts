// src/app/api/voice/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readJSON } from "@/lib/fsjson";

type VoiceNote = {
  id: string;
  memoryId: string;
  patientId?: string;
  audioPath: string;
  personName?: string;
  createdAt: string; // ISO
};
type VoiceDB = Record<string, VoiceNote>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const memoryId = req.nextUrl.searchParams.get("memoryId");
    console.log("memoryId", memoryId);
    if (!memoryId) {
      return NextResponse.json({ error: "memoryId required" }, { status: 400 });
    }

    // ✅ adjust path so it matches your repo layout
    const db = await readJSON<VoiceDB>("voiceNotes.json", {});
    console.log(db);
    const notes = Object.values(db)
      .filter((n) => n.memoryId === memoryId)
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());

    return NextResponse.json({ notes });
  } catch (e: any) {
    console.error("Error in /api/voice/list:", e);
    return NextResponse.json({ error: "Failed to read voice notes" }, { status: 500 });
  }
}
