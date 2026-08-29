"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/trends", label: "Trends" },
  { href: "/ask", label: "Ask LOOP" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-brand-dark text-white flex flex-col z-20">
      <div className="p-5 border-b border-white/10">
        <div className="font-bold text-lg">LOOP</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-3 py-2 rounded-lg text-sm transition ${
              pathname?.startsWith(link.href) ? "bg-brand text-white" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-sm bg-white/10 hover:bg-white/20 rounded-lg py-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}