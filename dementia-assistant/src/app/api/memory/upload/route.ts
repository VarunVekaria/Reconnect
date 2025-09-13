import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { getFaceEmbedding } from "../../../../lib/face";

import { upsertMemoryItem } from "../../../../lib/db";
import { captionFromBase64 } from "../../../../lib/caption";
import { embedText } from "../../../../lib/embeddings";
import type { MemoryItem, PersonTag } from "../../../../lib/memoryTypes";

export const runtime = "nodejs"; // ensure fs works

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const patientId = String(form.get("patientId") || "patient123");
    const file = form.get("file") as File | null;

    // Optional metadata
    const event = (form.get("event") as string) || "";
    const eventDate = (form.get("eventDate") as string) || ""; // "YYYY-MM-DD"
    const place = (form.get("place") as string) || "";
    const peopleJson = (form.get("people") as string) || "[]";
    const people = JSON.parse(peopleJson || "[]") as PersonTag[];
    const type = form.get("type") === "person" ? "person" : "memory";

    // For Add a Person, get name/relation fields if present
    const personName = (form.get("personName") as string) || "";
    const personRelation = (form.get("personRelation") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // 1) Save image under /public/memory/
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] || "jpg";
    const id = randomUUID();
    const relPath = `/memory/${id}.${ext}`;
    const absPath = path.join(process.cwd(), "public", relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buf);

    // Initialize variables for either embedding
    let caption: string | undefined = undefined;
    let embedding: number[] | undefined = undefined;
    let faceEmbedding: number[] | undefined = undefined;

    if (type === "memory") {
      // Only generate caption/embedding for memory type
      const b64 = buf.toString("base64");
      caption = await captionFromBase64(b64, file.type || "image/jpeg");
      embedding = await embedText(caption);
    } else if (type === "person") {
      // Only generate face embedding for person type
      const fe = await getFaceEmbedding(buf);
      if (!fe) {
        return NextResponse.json({ error: "No face found!" }, { status: 400 });
      }
      faceEmbedding = fe;
    }

    // 4) Store record in JSON
    const item: MemoryItem = {
      id,
      patientId,
      storagePath: relPath,
      event: event || undefined,
      eventDate: eventDate || undefined,
      place: place || undefined,
      people: people?.length ? people : undefined,
      caption,
      embedding,
      faceEmbedding,
      createdAt: new Date().toISOString(),
      type,
      ...(type === "person"
        ? {
            name: personName,
            relation: personRelation,
          }
        : {}),
    };

    await upsertMemoryItem(item);

    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "upload failed" }, { status: 500 });
  }
}
