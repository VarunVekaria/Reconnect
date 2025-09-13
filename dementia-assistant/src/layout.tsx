import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dementia Assistant – Chat",
  description: "Calm, concise assistant for patients and caregivers"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main className="container py-8">
          {/* <h1 className="text-2xl font-semibold mb-2">Assistant</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
            Ask in simple words. I’ll keep answers short and helpful.
          </p> */}
          {children}
        </main>
      </body>
    </html>
  );
}
