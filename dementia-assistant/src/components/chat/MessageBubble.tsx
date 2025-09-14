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
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        )}
      >
        {typeof children === "string" ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
        ) : (
          children
        )}

        {imageUrls.length > 0 && (
          <div className={cn("mt-2 grid gap-2", imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="memory"
                loading="lazy"
                className={cn(
                  "rounded-lg border",
                  isUser ? "border-white/25" : "border-gray-200",
                  "object-cover max-h-[220px] w-full"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
