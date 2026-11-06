"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { detectTeams, getUser, signIn } from "@/app/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (await detectTeams()) {
        if (!cancelled) router.replace("/teams");
        return;
      }

      const user = await getUser();
      if (user && !cancelled) router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
      router.replace("/");
    } catch {
      setError("Sign-in was cancelled or failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto my-[20vh] w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#F2C811] shadow-sm shadow-[#F2C811]/30">
        <span className="font-extrabold text-[#18181B] text-xl">P</span>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-card-foreground">Power BI Refresh</h1>
      <p className="mt-1 text-xs text-muted-foreground">Sign in with your organization account</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="w-full rounded-xl bg-[#F2C811] hover:bg-[#E5B800] py-2.5 px-4 text-sm font-bold text-[#18181B] shadow-sm shadow-[#F2C811]/30 active:scale-[0.98] transition disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in with Microsoft"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    </main>
  );
}
