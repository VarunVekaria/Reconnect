// src/app/caregiver/page.tsx
"use client";

import { useRef, useState } from "react";

export default function AddMemoryPage() {
  const patientId = "patient123";

  // mode
  const [mode, setMode] = useState<"person" | "memory">("memory");

  // file / dropzone
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // uploading
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // person (single)
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState("");

  // memory fields
  const [event, setEvent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [place, setPlace] = useState("");

  // dynamic people for memory
  const [numPeople, setNumPeople] = useState(0);
  const [peopleFields, setPeopleFields] = useState<
    { name: string; relation: string; contactNumber: string }[]
  >([]);

  function handleNumPeopleChange(val: number) {
    const v = Math.max(0, Math.floor(val));
    setNumPeople(v);
    setPeopleFields(prev =>
      Array.from({ length: v }, (_, i) => prev[i] || { name: "", relation: "", contactNumber: "" })
    );
  }

  function handlePersonChange(
    idx: number,
    field: "name" | "relation" | "contactNumber",
    value: string
  ) {
    setPeopleFields(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  // Dropzone helpers
  function onDropFiles(files?: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFileName(f.name);
    // push the file into the hidden input so FormData picks it up
    if (fileInputRef.current) {
      // create a fresh input to ensure the File object binds
      const dt = new DataTransfer();
      dt.items.add(f);
      fileInputRef.current.files = dt.files;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    onDropFiles(e.dataTransfer?.files);
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("patientId", patientId);

    if (mode === "person") {
      fd.set("type", "person");
      fd.set("people", JSON.stringify([{ name: personName, relation: personRelation }]));
      fd.delete("event");
      fd.delete("eventDate");
      fd.delete("place");
    } else {
      fd.set("type", "memory");
      if (peopleFields.length > 0) {
        const filtered = peopleFields.filter(p => p.name.trim() !== "");
        if (filtered.length) fd.set("people", JSON.stringify(filtered));
        else fd.delete("people");
      } else {
        fd.delete("people");
      }
    }

    setUploading(true);
    setToast(null);
    try {
      const r = await fetch("/api/memory/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      form.reset();
      // reset client state
      setPersonName("");
      setPersonRelation("");
      setEvent("");
      setEventDate("");
      setPlace("");
      setNumPeople(0);
      setPeopleFields([]);
      setFileName(null);
      setToast({ kind: "ok", msg: "Uploaded!" });
    } catch (err: any) {
      setToast({ kind: "err", msg: err?.message || "Upload failed" });
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Center card */}
        <section className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Add to Gallery</h2>

            {/* Mode pills */}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setMode("memory")}
                className={`rounded-full px-5 py-2 text-sm font-medium border
                ${mode === "memory"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-gray-300 dark:border-zinc-700"
                  }`}
              >
                Add a Memory
              </button>
              <button
                type="button"
                onClick={() => setMode("person")}
                className={`rounded-full px-5 py-2 text-sm font-medium border
                ${mode === "person"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-gray-300 dark:border-zinc-700"
                  }`}
              >
                Add a Person
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onUpload} className="mt-6 space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
                ${isDragging ? "border-blue-500 bg-blue-50/60" : "border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/40"}
              `}
              >
                <input
                  ref={fileInputRef}
                  name="file"
                  type="file"
                  accept="image/*"
                  required
                  hidden
                  onChange={(e) => onDropFiles(e.currentTarget.files)}
                />
                <div className="text-sm text-gray-600 dark:text-zinc-300">
                  <span className="font-semibold">Click to upload</span> or drag & drop a photo here
                </div>
                {fileName && (
                  <div className="mt-2 text-xs text-gray-500 truncate">Selected: {fileName}</div>
                )}
              </div>

              {/* PERSON MODE */}
              {mode === "person" && (
                <div className="grid gap-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <label className="text-sm w-full">
                      <span className="block mb-1 text-gray-600">Name*</span>
                      <input
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        required
                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                        placeholder="e.g., Priya"
                      />
                    </label>
                    <label className="text-sm w-full">
                      <span className="block mb-1 text-gray-600">Relation*</span>
                      <input
                        value={personRelation}
                        onChange={(e) => setPersonRelation(e.target.value)}
                        required
                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                        placeholder="e.g., Daughter"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* MEMORY MODE */}
              {mode === "memory" && (
                <div className="grid gap-4">
                  <label className="text-sm">
                    <span className="block mb-1 text-gray-600">Event</span>
                    <input
                      name="event"
                      value={event}
                      onChange={(e) => setEvent(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                      placeholder="e.g., Birthday"
                    />
                  </label>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="text-sm">
                      <span className="block mb-1 text-gray-600">Date*</span>
                      <input
                        name="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block mb-1 text-gray-600">Place</span>
                      <input
                        name="place"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                        placeholder="e.g., Central Park, NYC"
                      />
                    </label>
                  </div>

                  {/* People count + fields */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Number of people</span>
                      <div className="inline-flex rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleNumPeopleChange(numPeople - 1)}
                          className="px-3 py-1 text-lg leading-none bg-gray-50 dark:bg-zinc-800"
                          aria-label="Decrease"
                        >
                          –
                        </button>
                        <input
                          inputMode="numeric"
                          value={numPeople}
                          onChange={(e) => handleNumPeopleChange(Number(e.target.value || 0))}
                          className="w-14 text-center py-1 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleNumPeopleChange(numPeople + 1)}
                          className="px-3 py-1 text-lg leading-none bg-gray-50 dark:bg-zinc-800"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {peopleFields.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {peopleFields.map((person, i) => (
                          <div key={i} className="grid md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Name*"
                              value={person.name}
                              onChange={(e) => handlePersonChange(i, "name", e.target.value)}
                              className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Relation (optional)"
                              value={person.relation}
                              onChange={(e) => handlePersonChange(i, "relation", e.target.value)}
                              className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                            />
                            <input
                              type="tel"
                              placeholder="Contact Number (optional)"
                              value={person.contactNumber}
                              onChange={(e) => handlePersonChange(i, "contactNumber", e.target.value)}
                              className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* submit */}
              <div className="pt-1">
                <button
                  disabled={uploading}
                  className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>

            {/* toast */}
            {toast && (
              <div
                className={`mt-4 text-sm rounded-md px-3 py-2 border ${
                  toast.kind === "ok"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {toast.msg}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
