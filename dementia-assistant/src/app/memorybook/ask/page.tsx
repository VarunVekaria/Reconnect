"use client";
import { useState } from "react";

export default function AskMemoryPage() {
  const patientId = "patient123";
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matchType, setMatchType] = useState<"memory" | "person">("memory");

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

  return (
    <div className="container py-6 space-y-8">
      <br></br>
      <br></br>
      <h2 className="text-xl font-semibold">Ask About a Photo</h2>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          className={`px-3 py-1 rounded ${matchType === "memory" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMatchType("memory")}
        >
          Ask about a Memory
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded ${matchType === "person" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMatchType("person")}
        >
          Ask about a Person
        </button>
      </div>
      <form onSubmit={onMatch} className="space-y-3">
        <input name="file" type="file" accept="image/*" className="block text-sm" />
        {matchType === "memory" && (
          <>
            <div className="text-xs text-gray-500">or</div>
            <input name="queryText" placeholder="Describe the place/backdrop…" className="border rounded px-2 py-1 text-sm w-full" />
          </>
        )}
        <input type="hidden" name="matchType" value={matchType} />
        <button disabled={matching} className="bg-emerald-600 text-white rounded px-3 py-1 text-sm">
          {matching ? "Matching…" : (matchType === "person" ? "Find person" : "Find memory")}
        </button>
      </form>
      {matchResult && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-3 text-sm">
          <div className="font-medium mb-1">Answer</div>
          <div className="mb-2">{matchResult.answer} <span className="opacity-60">(confidence {matchResult.confidence})</span></div>
          {matchResult.best?.storagePath && (
            <img src={matchResult.best.storagePath} className="w-full max-w-sm rounded-lg border" alt="best match" />
          )}
          {matchResult.usedCaption && (
            <div className="mt-2 text-xs opacity-70">Query caption: {matchResult.usedCaption}</div>
          )}
        </div>
      )}
    </div>
  );
}
