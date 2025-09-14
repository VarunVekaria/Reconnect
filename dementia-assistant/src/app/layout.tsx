import "./globals.css";
import type { Metadata } from "next";
import { Cedarville_Cursive } from "next/font/google";
import FooterNav from "@/components/FooterNav";
import Navbar from "@/components/common/NavBar"; // <-- import your navbar

export const metadata: Metadata = {
  title: "Dementia Assistant – Chat",
  description: "Calm, concise assistant for patients and caregivers",
};

const cedarville = Cedarville_Cursive({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cedarville",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cedarville.variable} antialiased bg-white`}>
        <Navbar /> {/* <-- ADD NAVBAR HERE */}
        <main className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8 min-h-screen flex flex-col">
          {children}
        </main>
        <FooterNav />
      </body>
    </html>
  );
}
