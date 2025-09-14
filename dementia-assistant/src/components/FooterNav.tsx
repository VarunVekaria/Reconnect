"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/memorybook/ask", label: "Ask" },
  { href: "/memorypopup", label: "Reconnect" },
  { href: "/bot", label: "Bot" },
];

export default function FooterNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/90 border-t shadow-sm z-30">
      <div className="mx-auto max-w-5xl flex justify-center gap-4 py-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-5 py-2 rounded-full text-base font-medium border shadow-sm
              transition
              ${pathname === item.href
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border"
              }
            `}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
