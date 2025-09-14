import { readJSON, writeJSON } from "./fsjson";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

type TokenRecord = {
  memoryId: string;
  patientId: string;
  personName: string;
  phone?: string;
  expiresAt: string;  // ISO
  used: boolean;
  createdAt: string;  // ISO
};
type TokenDB = Record<string, TokenRecord>;

type VoiceNote = {
  id: string;
  memoryId: string;
  patientId: string;
  personName: string;
  phone?: string;
  audioPath: string;     // public path, e.g. /voice-notes/<file>
  transcript?: string;
  createdAt: string;     // ISO
};
type VoiceDB = Record<string, VoiceNote>;

const TOKENS_FILE = "notifyTokens.json";
const VOICE_FILE = "voiceNotes.json";

export async function createToken(rec: Omit<TokenRecord, "createdAt" | "used">) {
  const db = await readJSON<TokenDB>(TOKENS_FILE, {});
  const token = randomUUID().replace(/-/g, "");
  db[token] = { ...rec, used: false, createdAt: new Date().toISOString() };
  await writeJSON(TOKENS_FILE, db);
  return token;
}

export async function getToken(token: string) {
  const db = await readJSON<TokenDB>(TOKENS_FILE, {});
  return db[token];
}

export async function consumeToken(token: string) {
  const db = await readJSON<TokenDB>(TOKENS_FILE, {});
  if (!db[token]) return false;
  db[token].used = true;
  await writeJSON(TOKENS_FILE, db);
  return true;
}

export function isTokenValid(t?: TokenRecord | null) {
  if (!t || t.used) return false;
  if (!t.expiresAt) return false;
  return new Date(t.expiresAt).getTime() > Date.now();
}

export async function storeVoiceNote(v: VoiceNote) {
  const db = await readJSON<VoiceDB>(VOICE_FILE, {});
  db[v.id] = v;
  await writeJSON(VOICE_FILE, db);
}

export async function listVoiceNotesByMemory(memoryId: string) {
  const db = await readJSON<VoiceDB>(VOICE_FILE, {});
  return Object.values(db)
    .filter(v => v.memoryId === memoryId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveUploadedAudio(file: File, fileName: string) {
  const uploadDir = path.join(process.cwd(), "public", "voice-notes");
  await fs.mkdir(uploadDir, { recursive: true });
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const full = path.join(uploadDir, fileName);
  await fs.writeFile(full, buf);
  return "/voice-notes/" + fileName;
}


// --- add these exports in src/lib/notify.ts ---
export type { VoiceNote }; // so API/clients can import the type

export async function listVoiceNotesByPatient(patientId: string): Promise<VoiceNote[]> {
  const db = await readJSON<VoiceDB>(VOICE_FILE, {});
  return Object
    .values(db)
    .filter(v => v.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
