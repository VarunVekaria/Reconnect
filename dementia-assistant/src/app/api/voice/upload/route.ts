// app/api/voice/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import path from "path";
import fs from "fs/promises";

// If you have your own notify helpers, keep them. Otherwise remove these imports
// and use the inline minimal implementations below.
import { consumeToken, getToken, isTokenValid, saveUploadedAudio, storeVoiceNote } from "@/lib/notify";

/* ---------- Minimal fallbacks if you don't have the helpers ----------
async function saveUploadedAudio(file: File, filename: string): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const relDir = "/voice-notes";
  const relPath = `${relDir}/${filename}`;
  const absPath = path.join(process.cwd(), "public", relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, buf);
  return relPath; // web path (e.g. "/voice-notes/abc.webm")
}

async function getToken(token: string) {
  // TODO: lookup token in your DB
  // return { memoryId, patientId, personName, phone, expiresAt }
  return { memoryId: "mid", patientId: "pid", personName: "Friend", phone: "123", expiresAt: Date.now() + 999999 };
}
function isTokenValid(rec: any) { return !!rec; }
async function consumeToken(token: string) { return; }
async function storeVoiceNote(payload: any) { return; }
----------------------------------------------------------------------- */

function pickExt(mime: string | null, filename?: string): string {
  const lowerName = (filename || "").toLowerCase();
  if (lowerName.endsWith(".m4a")) return "m4a";
  if (lowerName.endsWith(".mp4")) return "mp4";
  if (lowerName.endsWith(".ogg")) return "ogg";
  if (lowerName.endsWith(".webm")) return "webm";
  const m = (mime || "").toLowerCase();
  if (m.includes("audio/mp4")) return "m4a";     // iOS/Safari
  if (m.includes("audio/mpeg")) return "mp3";
  if (m.includes("audio/ogg")) return "ogg";
  if (m.includes("audio/webm") || m.includes("video/webm")) return "webm";
  return "webm";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = String(form.get("token") || "");
    const audio = form.get("audio");

    if (!token || !(audio instanceof File)) {
      return NextResponse.json({ error: "token and audio required" }, { status: 400 });
    }

    const rec = await getToken(token);
    if (!isTokenValid(rec)) {
      return NextResponse.json({ error: "invalid or expired link" }, { status: 403 });
    }

    const id = "vnote_" + randomUUID().replace(/-/g, "");
    const ext = pickExt(audio.type || null, (audio as any).name);
    const filename = `${id}.${ext}`;

    // Save file under /public/voice-notes
    const audioPath = await saveUploadedAudio(audio, filename);

    // Optional transcription (never block)
    let transcript: string | undefined;
    if (process.env.OPENAI_API_KEY) {
      try {
        const { openai } = await import("@/lib/openai"); // your wrapper should safely read env
        // Lazy-import to avoid module-eval crashes if SDK version differs
        const { toFile } = await import("openai/uploads");

        const buf = Buffer.from(await (audio as File).arrayBuffer());
        const fileForOpenAI = await toFile(buf, filename, { type: audio.type || "application/octet-stream" });

        const sttModel = process.env.STT_MODEL || "whisper-1";
        const r = await openai.audio.transcriptions.create({
          model: sttModel,
          file: fileForOpenAI as any,
        });
        transcript = (r as any)?.text || undefined;
      } catch (e) {
        console.warn("Transcription failed (continuing):", e);
      }
    }

    await storeVoiceNote({
      id,
      memoryId: rec.memoryId,
      patientId: rec.patientId,
      personName: rec.personName,
      phone: rec.phone,
      audioPath,          // e.g. "/voice-notes/vnote_xxx.webm"
      transcript,
      createdAt: new Date().toISOString(),
    });

    await consumeToken(token);
    return NextResponse.json({ ok: true, audioPath, transcript });
  } catch (e: any) {
    console.error("Voice upload failed:", e);
    // Always return JSON so client doesn't try to parse HTML
    return NextResponse.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
