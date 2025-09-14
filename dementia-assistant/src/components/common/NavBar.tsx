"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { User } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <nav className="w-full flex items-center justify-between px-8 py-4 shadow bg-white/90 fixed top-0 left-0 z-50">
      {/* Left: Logo/Title */}
      <Link href="/" className="text-2xl font-cursive font-bold text-gray-800 hover:text-blue-600 transition">
        Reconnect
      </Link>

      {/* Right: User Dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Profile menu"
        >
          <User className="w-6 h-6 text-gray-700" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-xl z-50 border">
            <Link
              href="/"
              className="block px-4 py-3 text-gray-800 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Patient Profile
            </Link>
            <Link
              href="/caregiver"
              className="block px-4 py-3 text-gray-800 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Caregiver Profile
            </Link>
            <Link
              href="/doctor"
              className="block px-4 py-3 text-gray-800 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Doctor Profile
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
