import "./globals.css";
import type { Metadata } from "next";
import { Cedarville_Cursive } from "next/font/google";

export const metadata: Metadata = {
  title: "Dementia Assistant – Chat",
  description: "Calm, concise assistant for patients and caregivers",
};

// Load the font as a CSS variable so you can apply it only where needed
const cedarville = Cedarville_Cursive({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cedarville",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* keep the font variable available app-wide, but don't make everything cursive */}
      <body className={`${cedarville.variable} antialiased bg-white`}>
        {/* Explicit centered wrapper (instead of Tailwind's container) */}
        <main className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
