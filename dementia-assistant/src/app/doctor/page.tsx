"use client";
import LogsPanel from "@/components/caregiver/LogsPanel";

export default function DoctorPage() {
  const patientId = "patient123";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Doctor Mode</h1>
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Only entries that appear clinically relevant are shown. Urgent issues are listed first.
      </p>
      <LogsPanel patientId={patientId} medicalOnly />
    </div>
  );
}
