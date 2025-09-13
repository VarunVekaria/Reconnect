import { NextRequest, NextResponse } from "next/server";
import { listByPatient } from "../../../../lib/db";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId") || "patient123";
  const items = await listByPatient(patientId);
  return NextResponse.json({ items });
}
