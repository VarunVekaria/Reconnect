"use client";
import { cn } from "../../lib/utils";  // <-- fixed

export default function MessageBubble({
  role,
  children
}: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow",
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-sm"
        )}
      >
        {children}
      </div>
    </div>
  );
}
