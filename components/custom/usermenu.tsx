"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getAppUser } from "@/app/lib/auth-client";
import { app as teamsApp } from "@microsoft/teams-js";

type Props = { getToken: () => Promise<string | null> };
type Me = { name?: string | null; email?: string | null };

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const userPart = email.split("@")[0];
    const parts = userPart.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userPart.slice(0, 2).toUpperCase();
  }
  return "U";
}

function decodeJwtUser(token: string): { name?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      name: payload.name,
      email: payload.preferred_username || payload.upn || payload.email,
    };
  } catch {
    return null;
  }
}

export default function UserMenu({ getToken }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    let active = true;

    async function loadUser() {
      // 1. Immediate client detection (Teams context or MSAL account)
      try {
        const fastUser = await getAppUser();
        if (active && fastUser && (fastUser.name || fastUser.email)) {
          setMe({ name: fastUser.name, email: fastUser.email });
        }
      } catch {
        // ignore
      }

      // 2. Token-based detection (JWT decode and /api/me verification)
      try {
        const token = await getToken();
        if (!token) return;

        // Try fast JWT claim decode
        const decoded = decodeJwtUser(token);
        if (active && decoded && (decoded.name || decoded.email)) {
          setMe((prev) => ({
            name: decoded.name || prev?.name,
            email: decoded.email || prev?.email,
          }));
        }

        // Verify with /api/me
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const u = await res.json();
          if (active && u) {
            setMe({ name: u.name, email: u.email });
          }
        }
      } catch {
        // non-blocking
      }
    }

    void loadUser();

    // 3. Sync theme with Microsoft Teams if embedded
    try {
      teamsApp.getContext().then((ctx) => {
        if (ctx?.app?.theme) {
          const teamsTheme = ctx.app.theme === "dark" ? "dark" : "light";
          // Only sync if user hasn't manually set a preference
          if (!localStorage.getItem("theme")) {
            setTheme(teamsTheme);
          }
        }
      }).catch(() => {});
    } catch {
      // Not in Teams
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = mounted ? theme : "light";
  const userInitials = getInitials(me?.name, me?.email);

  const options = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1F1E1D] active:scale-95 transition"
        >
          <Avatar className="size-11 shadow-sm">
            <AvatarFallback className="bg-[#1F1E1D] text-sm font-bold text-[#F2C811] dark:bg-[#18181B] dark:text-[#F2C811] dark:border dark:border-[#F2C811]/30">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 rounded-2xl p-4 shadow-xl border border-slate-200/80 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback className="bg-[#F2C811] text-base font-bold text-[#1F1E1D]">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {me?.name || me?.email?.split("@")[0] || "Signed in"}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={me?.email || undefined}>
              {me?.email || "Connected with Microsoft"}
            </p>
          </div>
        </div>

        <Separator className=" bg-slate-200/80 dark:bg-slate-800" />

        <p className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Appearance
        </p>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
          {options.map(({ value, label, Icon }) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
                  active
                    ? "bg-[#F2C811] text-[#18181B] shadow-sm shadow-[#F2C811]/30"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
