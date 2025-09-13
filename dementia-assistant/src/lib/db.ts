import fs from "fs/promises";
import path from "path";
import { MemoryDB, MemoryItem } from "./memoryTypes";

const DB_PATH = path.join(process.cwd(), "src", "data", "memory.json");

export async function readMemoryDB(): Promise<MemoryDB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

export async function writeMemoryDB(db: MemoryDB) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function upsertMemoryItem(item: MemoryItem) {
  const db = await readMemoryDB();
  const list = db[item.patientId] ?? [];
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) list[idx] = item; else list.push(item);
  db[item.patientId] = list;
  await writeMemoryDB(db);
}

export async function listByPatient(patientId: string) {
  const db = await readMemoryDB();
  return db[patientId] ?? [];
}
