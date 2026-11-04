"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Activity, User } from "lucide-react";

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
      aria-label="Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(0,0,0,0.03)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all duration-150 active:scale-95 ${
                active
                  ? "text-[#854D0E] bg-[#F2C811]/15"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.4 : 1.8}
                style={active ? { color: "#A16207" } : undefined}
              />
              <span
                className={`text-[11px] tracking-tight ${
                  active ? "font-bold text-[#854D0E]" : "font-medium text-slate-500"
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
