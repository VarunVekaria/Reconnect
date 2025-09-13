"use client";
import { useState } from "react";

export default function AddMemoryPage() {
  const patientId = "patient123";
  const [uploading, setUploading] = useState(false);

  // Mode: 'person' or 'memory'
  const [mode, setMode] = useState<'person' | 'memory'>('memory');

  // Person fields
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState("");

  // Memory fields
  const [event, setEvent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [place, setPlace] = useState("");
  const [numPeople, setNumPeople] = useState(0);
  const [peopleFields, setPeopleFields] = useState<{ name: string; relation: string }[]>([]);

  function handleNumPeopleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
    setNumPeople(val);
    setPeopleFields(prev =>
      Array.from({ length: val }, (_, i) => prev[i] || { name: "", relation: "" })
    );
  }
  function handlePersonChange(idx: number, field: "name" | "relation", value: string) {
    setPeopleFields(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("patientId", patientId);

    if (mode === "person") {
      // Only add the single person

      const peopleJson = JSON.stringify([{ name: personName, relation: personRelation }]);
      fd.set("people", peopleJson);
      fd.set("type", "person");
      // We won't add event/date/place fields for 'person' mode
      fd.delete("event");
      fd.delete("eventDate");
      fd.delete("place");
    } else {
      // Add memory with peopleFields
      fd.set("type", "memory");
      if (peopleFields.length > 0) {
        const filtered = peopleFields.filter(p => p.name.trim() !== "");
        fd.set("people", JSON.stringify(filtered));
      } else {
        fd.delete("people");
      }
      // Event/date/place already in form
    }

    setUploading(true);
    try {
      const r = await fetch("/api/memory/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      form.reset();
      // Reset states
      setPersonName(""); setPersonRelation("");
      setEvent(""); setEventDate(""); setPlace("");
      setNumPeople(0); setPeopleFields([]);
      alert("Uploaded!");
    } catch (err: any) {
      alert("Upload failed: " + err?.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container py-6 space-y-8">
      <h2 className="text-xl font-semibold">Add to Gallery</h2>
      {/* Mode Toggle */}
      <div className="flex gap-4 mb-6">
        <label className="inline-flex items-center gap-1">
          <input type="radio" checked={mode === 'person'} onChange={() => setMode('person')} />
          Add a person
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="radio" checked={mode === 'memory'} onChange={() => setMode('memory')} />
          Add a memory
        </label>
      </div>

      <form onSubmit={onUpload} className="space-y-3">

        {/* Common: Image is required for both */}
        <input name="file" type="file" accept="image/*" required className="block text-sm" />

        {/* Add a person */}
        {mode === "person" && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              required
              className="border rounded px-2 py-1 text-sm w-full"
            />
            <input
              type="text"
              placeholder="Relation"
              value={personRelation}
              onChange={e => setPersonRelation(e.target.value)}
              required
              className="border rounded px-2 py-1 text-sm w-full"
            />
          </div>
        )}

        {/* Add a memory */}
        {mode === "memory" && (
          <div className="space-y-2">
            <input
              name="event"
              placeholder="Event (e.g., Birthday)"
              value={event}
              onChange={e => setEvent(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
            />
            <input
              name="eventDate"
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
              required
            />
            <input
              name="place"
              placeholder="Place (e.g., Central Park, NYC)"
              value={place}
              onChange={e => setPlace(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
            />
            {/* People dynamic fields */}
            <div className="space-y-1">
              <label className="block text-sm font-medium">Number of people:</label>
              <input
                type="number"
                min={0}
                value={numPeople}
                onChange={handleNumPeopleChange}
                className="border rounded px-2 py-1 text-sm w-20"
              />
            </div>
            {peopleFields.map((person, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder="Name"
                  value={person.name}
                  onChange={e => handlePersonChange(i, "name", e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Relation (optional)"
                  value={person.relation}
                  onChange={e => handlePersonChange(i, "relation", e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <button disabled={uploading} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
