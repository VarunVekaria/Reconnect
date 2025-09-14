"use client";
import { useRouter, useSearchParams } from "next/navigation";

export type TabKey = "schedule" | "logs" | "gallery" ;

export default function Tabs({
  tabs,
  defaultTab = "schedule",
  className = ""
}: {
  tabs: { key: TabKey; label: string; content: React.ReactNode }[];
  defaultTab?: TabKey;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active = (params.get("tab") as TabKey) || defaultTab;

  const setTab = (key: TabKey) => {
    const usp = new URLSearchParams(params);
    usp.set("tab", key);
    router.replace(`?${usp.toString()}`);
  };

  return (
    <div className={className}>
      <div className="flex gap-2 border-b border-gray-200 dark:border-zinc-800 mb-4">
        {tabs.map(t => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm rounded-t-md ${
                isActive
                  ? "bg-white dark:bg-zinc-900 border border-b-0 border-gray-200 dark:border-zinc-800"
                  : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              aria-pressed={isActive}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="rounded-b-md border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
        {tabs.find(t => t.key === active)?.content}
      </div>
    </div>
  );
}
