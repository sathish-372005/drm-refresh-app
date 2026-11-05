"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Activity, Bell, User } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dataset",
    label: "Datasets",
    icon: Database,
    isActive: (pathname: string) =>
      pathname === "/" || pathname === "/dataset" || pathname.startsWith("/dataset/"),
  },
  {
    href: "/history",
    label: "Activity",
    icon: Activity,
    isActive: (pathname: string) =>
      pathname === "/history" || pathname.startsWith("/history/"),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: Bell,
    isActive: (pathname: string) =>
      pathname === "/alerts" || pathname.startsWith("/alerts/"),
  },
  {
    href: "/account",
    label: "Account",
    icon: User,
    isActive: (pathname: string) =>
      pathname === "/account" || pathname.startsWith("/account/"),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on login or auth screens
  if (pathname === "/login" || pathname === "/teams/auth-start" || pathname === "/teams/auth-end") {
    return null;
  }

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.03)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-500 transition-colors duration-150 hover:text-slate-800 active:scale-95"
            >
              <Icon
                className={`size-6 ${active ? "text-primary" : ""}`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className={`text-[11px] tracking-tight ${
                  active ? "font-semibold text-slate-900" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
