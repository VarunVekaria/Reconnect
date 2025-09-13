import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { toFile } from "openai/uploads";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No audio" }, { status: 400 });
    }

    const model = process.env.STT_MODEL || "whisper-1";

    // Convert the browser File -> proper File/stream for the SDK
    const result = await openai.audio.transcriptions.create({
      file: await toFile(file, "input.webm"),
      model,
      // language: "en", // optionally pin a language
      // prompt: "Care context: dementia support", // optional biasing
      response_format: "json",
    });

    const text = (result as any).text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("STT error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
