
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Database, History } from "lucide-react";

const items = [
  { href: "/dataset", label: "Datasets", Icon: Database },
  { href: "/history", label: "Activity", Icon: History },
  { href: "/alerts", label: "Alerts", Icon: Bell },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-2rem)] max-w-[22rem]"
    >
      <div className="flex h-[3.75rem] items-center gap-1 rounded-full bg-[#1d1d1f] p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.24)] ring-1 ring-black/10">
        {items.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={active ? undefined : label}
              className={`flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-full transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d1d1f] ${
                active
                  ? "flex-[1.65] bg-[#f5d313] px-4 text-[#171717] shadow-sm"
                  : "flex-1 px-2 text-white/75 hover:bg-white/10 hover:text-white active:scale-95"
              }`}
            >
              <Icon
                aria-hidden="true"
                className="size-[1.125rem] shrink-0"
                strokeWidth={active ? 2.2 : 1.8}
              />
              {active ? (
                <span className="truncate text-xs font-semibold tracking-wide">
                  {label}
                </span>
              ) : (
                <span className="sr-only">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
