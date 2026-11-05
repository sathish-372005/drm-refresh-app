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
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 py-1 transition-colors duration-150 active:scale-95"
            >
              {/* Fixed-size slot so labels stay on one line for every tab */}
              <span className="relative block size-7">
                {active ? (
                  <span className="absolute -top-4 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-[#F2C811] text-[#18181B] shadow-md shadow-[#F2C811]/40 ring-[3px] ring-background">
  <Icon className="size-5" strokeWidth={2.4} />
</span>
                ) : (
                  <Icon
                    className="size-7 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                )}
              </span>

              <span
                className={`text-[11px] tracking-tight ${
                  active
                    ? "font-semibold text-[#A16207] dark:text-[#F2C811]"
                    : "font-medium text-muted-foreground"
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