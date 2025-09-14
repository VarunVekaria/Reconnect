"use client";
import { useEffect } from "react";
import LogsPanel from "@/components/caregiver/LogsPanel";

export default function DoctorPage() {
  const patientId = "patient123";

    // HIDE the footer nav only on this page
    useEffect(() => {
      const footer = document.querySelector("nav.fixed.bottom-0");
      if (footer instanceof HTMLElement) footer.style.display = "none";
      return () => {
        if (footer instanceof HTMLElement) footer.style.display = "";
      };
    }, []);



  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <br></br>
          <h1 className="text-2xl font-semibold">Doctor Mode</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Only entries that appear clinically relevant are shown. Urgent issues are listed first.
          </p>
        </div>
      </header>

      {/* Medical-only log list */}
      <LogsPanel patientId={patientId} medicalOnly />
    </div>
  );
}
