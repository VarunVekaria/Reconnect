"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PatientContext = {
  [key: string]: {
    name?: string;
  };
};

export default function Home() {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data/context.json");
        const data: PatientContext = await res.json();
        // grab the first patient in the JSON (patient123)
        const firstPatient = Object.values(data)[0];
        setName(firstPatient?.name ?? "Friend");
      } catch {
        setName("Friend");
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen flex flex-col justify-between bg-white">
      {/* Greeting */}
      <div className="flex-1 flex items-center justify-center">
      <h1 className="text-6xl md:text-7xl font-bold text-gray-600 [font-family:var(--font-cedarville)]">
  Hi {name}
</h1>

      </div>

      {/* Buttons */}
      <div className="w-full flex justify-center gap-8 pb-12">
        <Link
          href="/memorybook/ask"
          className="px-6 py-3 rounded-lg shadow bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-medium"
        >
          Ask
        </Link>

        <Link
          href="/memorypopup"
          className="px-6 py-3 rounded-lg shadow bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-medium"
        >
          Reconnect
        </Link>

        <Link
          href="/bot"
          className="px-6 py-3 rounded-lg shadow bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-medium"
        >
          Bot
        </Link>
      </div>
    </main>
  );
}
