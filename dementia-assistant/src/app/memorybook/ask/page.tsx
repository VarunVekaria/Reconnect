"use client";
import { useRef, useState } from "react";

export default function AskMemoryPage() {
  const patientId = "patient123";
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matchType, setMatchType] = useState<"memory" | "person">("memory");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onMatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("patientId", patientId);
    setMatching(true);
    try {
      const r = await fetch("/api/memory/match", { method: "POST", body: fd });
      const j = await r.json();
      setMatchResult(j);
    } catch (err: any) {
      alert("Match failed: " + err?.message);
    } finally {
      setMatching(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? "");
  }

  // -- Drag and drop for file upload
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current && e.dataTransfer.files.length > 0) {
      fileInputRef.current.files = e.dataTransfer.files;
      setFileName(e.dataTransfer.files[0].name);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 py-10">
      <div className="bg-white w-full max-w-lg mx-auto rounded-2xl shadow-lg p-8 flex flex-col gap-8 border">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ask About a Photo</h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`px-4 py-2 rounded-full transition font-semibold ${matchType === "memory" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
              onClick={() => setMatchType("memory")}
            >
              Ask about a Memory
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-full transition font-semibold ${matchType === "person" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
              onClick={() => setMatchType("person")}
            >
              Ask about a Person
            </button>
          </div>
        </div>

        <form onSubmit={onMatch} className="space-y-6">
          {/* Drag and drop upload */}
          <label
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className={`w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-8 cursor-pointer transition 
              ${fileName ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
          >
            <input
              ref={fileInputRef}
              name="file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="text-gray-500 text-sm">
              {fileName ? (
                <span className="text-blue-700 font-medium">{fileName}</span>
              ) : (
                <>
                  <span className="font-semibold">Click to upload</span> or drag & drop a photo here
                </>
              )}
            </div>
          </label>

          {/* {matchType === "memory" && (
            <>
              <div className="text-xs text-gray-500 text-center">or</div>
              <input
                name="queryText"
                placeholder="Describe the place, event, or scene…"
                className="border rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </>
          )} */}
          <input type="hidden" name="matchType" value={matchType} />

          <button
            disabled={matching}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-base font-semibold transition"
          >
            {matching ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Matching…
              </span>
            ) : matchType === "person" ? "Find person" : "Find memory"}
          </button>
        </form>

        {matchResult && (
          <div className="rounded-xl border bg-gray-50 p-4 text-sm mt-2 shadow-inner">
            <div className="font-semibold mb-1 text-gray-800">Result</div>
            <div className="mb-2">{matchResult.answer} <span className="opacity-50">(confidence {matchResult.confidence})</span></div>
            {matchResult.best?.storagePath && (
              <img src={matchResult.best.storagePath} className="w-full max-w-xs rounded-lg border mb-2" alt="best match" />
            )}
            {/* {matchResult.usedCaption && (
              <div className="mt-1 text-xs opacity-70">Query caption: {matchResult.usedCaption}</div>
            )} */}
          </div>
        )}
      </div>
    </div>
  );
}
