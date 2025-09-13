"use client";
import React from "react";
import { cn } from "@/lib/utils";

export default function MessageBubble({
  isUser,
  children,
  imageUrls = [],
}: {
  isUser?: boolean;
  children?: React.ReactNode;
  imageUrls?: string[];
}) {
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
        {typeof children === "string" ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
        ) : (
          children
        )}

        {imageUrls.map((url, i) => (
          <div key={i} className="mt-2">
          <img
            src={url}
            alt="memory"
            loading="lazy"
            className="rounded-lg border border-gray-200 dark:border-zinc-700
                       max-w-[300px] max-h-[300px] object-cover"
          />
        </div>
        ))}
      </div>
    </div>
  );
}
