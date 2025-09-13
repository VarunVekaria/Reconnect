import { promises as fs } from "fs";
import path from "path";

function dataPath(rel: string) {
  // Ensure absolute path to /src/data/*
  return path.join(process.cwd(), "src", "data", rel);
}

export async function readJSON<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const full = dataPath(relPath);
    const buf = await fs.readFile(full, "utf-8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(relPath: string, data: T): Promise<void> {
  const full = dataPath(relPath);
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(full, json, "utf-8");
}
