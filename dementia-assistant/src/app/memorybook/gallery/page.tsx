"use client";
import { useEffect, useState } from "react";

type PersonTag = { name: string; relation?: string };
type Item = {
  id: string;
  storagePath: string;
  event?: string;
  eventDate?: string;
  place?: string;
  people?: PersonTag[];
  caption: string;
  type?: "person" | "memory";
};

export default function GalleryPage() {
  const patientId = "patient123";
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    async function load() {
      const r = await fetch(`/api/memory/list?patientId=${patientId}`);
      const j = await r.json();
      setItems(j.items || []);
    }
    load();
  }, []);

  // Split into people and memories
  const peoplePhotos = items.filter(i => i.type === "person");
  const memoryPhotos = items.filter(i => i.type !== "person"); // default to memory if type is missing

  return (
    <div className="container py-6 space-y-8">
      <h2 className="text-xl font-semibold mb-4">Gallery</h2>

      {/* People Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2">People you can trust</h3>
        {!peoplePhotos.length && (
          <p className="text-sm text-gray-500">No photos of people yet. Add some in the “Add a person” section.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {peoplePhotos.map(i => (
            <figure key={i.id} className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
              <img src={i.storagePath} alt={i.caption} className="w-full h-40 object-cover" />
              <figcaption className="p-2 text-xs text-gray-700 dark:text-zinc-300">
                <div className="font-medium">{i.people?.[0]?.name || "Person"}</div>
                <div>{i.people?.[0]?.relation}</div>
                <div className="opacity-60">{i.caption}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Memories Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2 mt-8">Memories you've made</h3>
        {!memoryPhotos.length && (
          <p className="text-sm text-gray-500">No memory photos yet. Add some in the “Add a memory” section.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {memoryPhotos.map(i => (
            <figure key={i.id} className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
              <img src={i.storagePath} alt={i.caption} className="w-full h-40 object-cover" />
              <figcaption className="p-2 text-xs text-gray-700 dark:text-zinc-300">
                <div className="font-medium">{i.event || "Memory"}</div>
                <div>{[i.place, i.eventDate].filter(Boolean).join(" • ") || "—"}</div>
                {i.people?.length ? <div>With: {i.people.map(p => p.name).join(", ")}</div> : null}
                <div className="opacity-60">{i.caption}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
