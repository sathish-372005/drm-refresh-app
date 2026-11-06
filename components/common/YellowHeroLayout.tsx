"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import UserMenu from "@/components/custom/usermenu";

type Props = {
  title: string;
  subtitle?: string;
  headline?: ReactNode;
  back?: { href: string; label: string };
  search: { value: string; onChange: (value: string) => void; placeholder: string };
  getToken: () => Promise<string | null>;
  children: ReactNode;
};

export const YellowHeroLayout = ({ title, subtitle, headline, back, search, getToken, children }: Props) => (
  <div className="flex flex-1 flex-col">
    {/* Yellow hero: title, avatar menu, headline, search */}
    <section className="-mx-4 bg-[#F2C811] px-5 pb-14 pt-5 text-[#1F1E1D]">
      {back && (
        <Link
          href={back.href}
          className="mb-1 flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[#3B3A39] hover:text-[#18181B] transition"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#18181B]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-[#3B3A39]">{subtitle}</p>}
        </div>
        <UserMenu getToken={getToken} />
      </div>

      {headline && (
        <div className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tight text-[#18181B]">
          {headline}
        </div>
      )}

      <label className="relative mt-5 block">
        <span className="sr-only">{search.placeholder}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder}
          className="h-12 w-full rounded-full border-0 bg-card pl-11 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:ring-2 focus:ring-[#18181B] dark:focus:ring-white/40 transition"
        />
      </label>
    </section>

    {/* White sheet */}
    <section className="relative -mx-4 -mb-20 -mt-8 flex-1 space-y-4 rounded-t-[28px] bg-background px-4 pb-24 pt-5 transition-colors duration-150">
      {children}
    </section>
  </div>
);

