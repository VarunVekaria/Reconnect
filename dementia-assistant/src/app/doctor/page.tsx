"use client";
import LogsPanel from "@/components/caregiver/LogsPanel";

export default function DoctorPage() {
  const patientId = "patient123";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
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
