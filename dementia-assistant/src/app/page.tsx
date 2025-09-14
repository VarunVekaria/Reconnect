"use client";
import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col px-4 md:px-6">
        {/* Centered greeting */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Big cursive */}
          <h1 className="text-6xl md:text-7xl font-bold text-gray-600 [font-family:var(--font-cedarville)] mb-2">
            Reconnect..
          </h1>
          {/* Friendly subtitle */}
          <div className="text-2xl md:text-3xl font-semibold text-gray-500 mt-2 mb-2">
            Hi, How are you today
          </div>
        </div>

        {/* Buttons row (bottom, horizontally) */}
        
      </div>
    </main>
  );
}
