"use client";

import Tabs from "@/components/common/tabs";
import ScheduleEditor from "@/components/caregiver/ScheduleEditor";
import LogsPanel from "@/components/caregiver/LogsPanel";

export default function CaregiverPage() {
  const patientId = "patient123";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Caregiver Mode</h1>

      <Tabs
        defaultTab="schedule"
        tabs={[
          {
            key: "schedule",
            label: "Schedule",
            content: <ScheduleEditor patientId={patientId} />
          },
          {
            key: "logs",
            label: "Logs",
            content: <LogsPanel patientId={patientId} />
          }
        ]}
      />
    </div>
  );
}
