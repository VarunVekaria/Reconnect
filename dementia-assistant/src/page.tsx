"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col gap-4 w-64">
        <Link
          href="/ask"
          className="px-6 py-3 rounded-xl shadow bg-blue-600 text-white text-center text-lg font-semibold"
        >
          Ask
        </Link>

        <Link
          href="/memorypopup"
          className="px-6 py-3 rounded-xl shadow bg-green-600 text-white text-center text-lg font-semibold"
        >
          Reconnect
        </Link>

        <Link
          href="/bot"
          className="px-6 py-3 rounded-xl shadow bg-purple-600 text-white text-center text-lg font-semibold"
        >
          Bot
        </Link>
      </div>
    </main>
  );
}
