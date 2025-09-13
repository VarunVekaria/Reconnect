// src/lib/time.ts
// Minimal helper so the rest of the app runs without luxon.
// Returns a JS Date (local time). We keep the same function name.

export function nowInTZ(_tz?: string) {
    // Ignoring tz for now — always use local time.
    return new Date();
  }
  