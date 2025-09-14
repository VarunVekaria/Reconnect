"use client";

import { useEffect } from "react";
import Tabs from "@/components/common/tabs";
import ScheduleEditor from "@/components/caregiver/ScheduleEditor";
import LogsPanel from "@/components/caregiver/LogsPanel";
import AddMemoryPage from "@/components/caregiver/page";

export default function CaregiverPage() {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Caregiver Mode</h1>
      <Tabs
        defaultTab="schedule"
        tabs={[
          {
            key: "schedule",
            label: "Schedule",
            content: <ScheduleEditor patientId={patientId} />,
          },
          {
            key: "logs",
            label: "Logs",
            content: <LogsPanel patientId={patientId} />,
          },
          {
            key: "gallery",
            label: "Gallery",
            content: <AddMemoryPage />,
          },
        ]}
      />
    </div>
  );
}
