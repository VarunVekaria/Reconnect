import React from "react";

export default function MemorybookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Memorybook-only navbar */}
      <nav className="flex gap-4 mb-8 text-base border-b pb-2">
      <a href="/memorybook/ask" className="hover:underline">Ask About a Photo</a>
        <a href="/memorybook/gallery" className="hover:underline">Gallery</a>
        {/* <a href="/memorybook/add" className="hover:underline">Add Photo</a> */}
        
      </nav>
      <div>{children}</div>
    </div>
  );
}
