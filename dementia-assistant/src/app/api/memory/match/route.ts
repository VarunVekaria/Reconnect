import { NextRequest, NextResponse } from "next/server";
import { listByPatient } from "../../../../lib/db";
import { captionFromBase64 } from "../../../../lib/caption";
import { embedText } from "../../../../lib/embeddings";
import { cosineSim } from "../../../../lib/similarity";
import { getFaceEmbedding } from "../../../../lib/face";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const patientId = String(form.get("patientId") || "patient123");
    const file = form.get("file") as File | null;
    const queryText = (form.get("queryText") as string) || "";
    const matchType = (form.get("matchType") as string) || "memory"; // "memory" or "person"

    const items = await listByPatient(patientId);
    if (!items.length) {
      return NextResponse.json({ match: null, reason: "No entries in gallery yet." });
    }

    // 🟢 PERSON MATCHING LOGIC
    if (matchType === "person") {
      if (!file) {
        return NextResponse.json({ error: "Please upload a face photo." }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const faceEmbedding = await getFaceEmbedding(buf);
      if (!faceEmbedding) {
        return NextResponse.json({ error: "No face detected in photo." }, { status: 400 });
      }
      // Only consider items added as person and with faceEmbedding
      const people = items.filter(i => i.type === "person" && Array.isArray(i.faceEmbedding));
      if (!people.length) {
        return NextResponse.json({ match: null, reason: "No people entries in gallery yet." });
      }
      const scored = people
        .map(it => ({
          item: it,
          score: cosineSim(faceEmbedding, it.faceEmbedding!)
        }))
        .sort((a, b) => b.score - a.score);

      const top = scored[0];
      const confidence = Number(top.score.toFixed(3));
      const likely = confidence >= 0.5; // You may tune threshold
      // console.log(top);
      const i = top.item;
      const name = i.people?.[0]?.name || i.name || "Someone";
      const relation = i.people?.[0]?.relation || "relative";

      let answer: string;
      if (confidence > 0.5) {
        answer = `This is ${name}, your ${relation}.`;
      } else if (confidence > 0.4) {
        answer = `This might be ${name}, your ${relation}.`;
      } else {
        answer = `This is an unknown person.`;
      }


      return NextResponse.json({
        answer,
        confidence,
        best: {
          id: i.id,
          name: name,
          relation: relation,
          storagePath: i.storagePath,
        }
      });
    }

    // 🟢 MEMORY MATCHING LOGIC (as before)
    // Build a query embedding (from photo caption OR plain text)
    let queryEmbedding: number[];
    let usedCaption = "";

    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      usedCaption = await captionFromBase64(buf.toString("base64"), file.type || "image/jpeg");
      queryEmbedding = await embedText(usedCaption);
    } else if (queryText) {
      queryEmbedding = await embedText(queryText);
    } else {
      return NextResponse.json({ error: "Provide a file or queryText." }, { status: 400 });
    }

    // Only consider memory-type items
    const memories = items.filter(i => i.type !== "person");

    if (!memories.length) {
      return NextResponse.json({ match: null, reason: "No memory entries in gallery yet." });
    }

    // Score by cosine similarity
    const scored = items
  .filter(it => Array.isArray(it.embedding)) // <--- only items with embedding
  .map(it => ({ item: it, score: cosineSim(queryEmbedding, it.embedding!) }))
  .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const confidence = Number(top.score.toFixed(3));

    // Basic thresholding — tune as you collect data
    const likely = confidence >= 0.50;

    // Compose a friendly, compact answer
    const i = top.item;
    const who = i.people?.length ? ` with ${i.people.map(p => p.relation ? `${p.name} (${p.relation})` : p.name).join(", ")}` : "";
    const when = i.eventDate ? ` on ${i.eventDate}` : "";
    const where = i.place ? ` at ${i.place}` : "";
    const what  = i.event ? i.event : "a special day";

    const answer = likely
      ? `This looks like ${what}${where}${when}${who}.`
      : `This might be ${what}${where}${when}${who}.`;

    return NextResponse.json({
      answer,
      confidence,
      best: {
        id: i.id,
        storagePath: i.storagePath,
        event: i.event,
        eventDate: i.eventDate,
        place: i.place,
        people: i.people
      },
      usedCaption: usedCaption || undefined
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "match failed" }, { status: 500 });
  }
}
