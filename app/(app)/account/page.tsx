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
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc] space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account</h1>

      {/* Profile Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#3730a3]/10 text-[#3730a3]">
            <User className="size-6 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {user?.name || "Microsoft User"}
            </h2>
            <p className="text-xs text-slate-500 truncate">{user?.username || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 border border-emerald-100">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>Connected to Microsoft Entra ID & Power BI</span>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
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

