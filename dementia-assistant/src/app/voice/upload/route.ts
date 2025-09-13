import { NextRequest, NextResponse } from "next/server";
import { consumeToken, getToken, isTokenValid, saveUploadedAudio, storeVoiceNote } from "@/lib/notify";
import { randomUUID } from "crypto";
import { openai } from "@/lib/openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

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

    // Save audio to public
    const id = "vnote_" + randomUUID().replace(/-/g, "");
    const ext = (audio.type.includes("mp4") ? "mp4" : "webm");
    const audioPath = await saveUploadedAudio(audio, `${id}.${ext}`);

    // Optional: transcribe with Whisper
    let transcript: string | undefined = undefined;
    try {
      const sttModel = process.env.STT_MODEL || "whisper-1";
      const fileObj = await toFile(Buffer.from(await audio.arrayBuffer()), `note.${ext}`);
      const r = await openai.audio.transcriptions.create({ model: sttModel, file: fileObj as any });
      transcript = (r as any)?.text || undefined;
    } catch (e) {
      console.warn("STT failed, storing audio only:", e);
    }

    await storeVoiceNote({
      id,
      memoryId: rec.memoryId,
      patientId: rec.patientId,
      personName: rec.personName,
      phone: rec.phone,
      audioPath,
      transcript,
      createdAt: new Date().toISOString(),
    });

    await consumeToken(token);
    return NextResponse.json({ ok: true, audioPath, transcript });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
