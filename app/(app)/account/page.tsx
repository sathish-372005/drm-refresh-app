"use client";

import { useEffect, useState } from "react";
import { User, LogOut, CheckCircle2 } from "lucide-react";
import { getUser, signOut } from "@/app/lib/auth-client";

export default function AccountPage() {
  const [user, setUser] = useState<{ name: string | null; username: string } | null>(null);

  useEffect(() => {
    void getUser().then(setUser);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 bg-background p-4 pb-20 pt-6 text-foreground">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Account</h1>

      {/* Profile Card */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-foreground">
            <User className="size-6 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-card-foreground">
              {user?.name || "Microsoft User"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{user?.username || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <span>Connected to Microsoft Entra ID & Power BI</span>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center justify-between rounded-xl p-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          <span className="flex items-center gap-2">
            <LogOut className="size-4" />
            <span>Sign out</span>
          </span>
        </button>
      </div>
    </main>
  );
}
