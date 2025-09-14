"use client";

import { useEffect, useState } from "react";

type VoiceNote = {
  id: string;
  memoryId: string;
  patientId: string;
  personName?: string;
  audioPath: string;
  createdAt: string;
};

export default function VoiceNoteForMemory({ memoryId }: { memoryId: string }) {
  const [note, setNote] = useState<VoiceNote | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVoiceNotes() {
      try {
        const r = await fetch(`/api/voice/list`);
        const j = await r.json();
        const notes: VoiceNote[] = Array.isArray(j?.notes) ? j.notes : [];

        // Always filter based on current memoryId regardless of prop change
        const filtered = notes.filter((n) => n.memoryId === memoryId);
        const latest = filtered.sort(
          (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
        )[0] || null;

        if (!cancelled) setNote(latest);
      } catch (e) {
        if (!cancelled) setNote(null);
      }
    }

    fetchVoiceNotes();

    return () => {
      cancelled = true;
    };
  }, []); // <-- empty array means run **once** on mount only

  if (!note) return null;

  return (
    <div className="mt-3">
      <div className="text-sm text-gray-700">
        Voice note {note.personName ? `from ${note.personName}` : ""}:
      </div>
      <audio controls src={note.audioPath} className="w-full mt-1" />
    </div>
  );
}
