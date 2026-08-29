"use client";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/trends": "Trends",
  "/ask": "Ask LOOP",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = Object.entries(TITLES).find(([path]) => pathname?.startsWith(path))?.[1] ?? "LOOP";
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-10 bg-brand text-white px-8 py-5 flex items-center justify-between shadow-sm">
      <h1 className="font-bold text-2xl">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">{session?.user?.name}</div>
          <div className="text-xs text-white/70">{session?.user?.role}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-white text-brand flex items-center justify-center font-semibold">
          {initial}
        </div>
      </div>
    </header>
  );
}