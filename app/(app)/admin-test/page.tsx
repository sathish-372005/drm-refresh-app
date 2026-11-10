"use client";

import { useState } from "react";
import { getAppToken } from "@/app/lib/auth-client";

type TestWorkspace = {
  id?: string;
  name?: string;
  datasets?: unknown[];
};

export default function AdminTestPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus(null);
    try {
      const token = await getAppToken();
      if (!token) throw new Error("No token. Sign in first (/login).");

      const res = await fetch("/api/powerbi/admin/workspaces?top=50", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      setStatus(res.status);
      setResult(await res.json().catch(() => null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const workspaces: TestWorkspace[] = Array.isArray(result?.workspaces)
    ? (result.workspaces as TestWorkspace[])
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 bg-background p-4 pb-24 pt-6 text-foreground">
      <h1 className="text-xl font-bold">Admin API test</h1>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="h-11 rounded-full bg-[#F2C811] px-5 text-sm font-semibold text-[#18181B] disabled:opacity-60"
      >
        {loading ? "Loading…" : "Call /admin/workspaces"}
      </button>

      {status !== null && (
        <p className="text-sm">
          HTTP status: <b>{status}</b>
          {workspaces.length > 0 && <> · {workspaces.length} workspaces</>}
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {workspaces.slice(0, 5).map((w, idx) => (
        <div key={w.id ?? idx} className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">{w.name ?? "Untitled"}</p>
          <p className="text-xs text-muted-foreground">{(w.datasets ?? []).length} datasets</p>
        </div>
      ))}

      {result && (
        <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-card p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}