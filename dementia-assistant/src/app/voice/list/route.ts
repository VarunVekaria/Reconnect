import { NextRequest, NextResponse } from "next/server";
import { listVoiceNotesByMemory } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const memoryId = req.nextUrl.searchParams.get("memoryId") || "";
  if (!memoryId) return NextResponse.json({ error: "memoryId required" }, { status: 400 });
  const notes = await listVoiceNotesByMemory(memoryId);
  return NextResponse.json({ notes });
}
