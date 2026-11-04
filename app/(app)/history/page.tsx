"use client";

import { useEffect, useState } from "react";
import { getWebToken } from "@/app/lib/auth-client";
import { Activity, Clock } from "lucide-react";
import { formatRelativeTime } from "@/components/dataset/format-utils";
import StatusBadge from "@/components/dataset/StatusBadge";
import Link from "next/link";

type DatasetActivity = {
  id: string;
  name: string;
  workspaceName: string;
  workspaceId: string;
  status: string;
  timeAgo: string;
  type: string;
};

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<DatasetActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const token = await getWebToken();
        if (!token) return;

        const res = await fetch("/api/powerbi/datasets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load activity.");
        const data = await res.json();

        const items: DatasetActivity[] = [];
        for (const w of data.workspaces || []) {
          for (const d of w.datasets || []) {
            if (d.lastRefresh) {
              items.push({
                id: d.id,
                name: d.name,
                workspaceName: w.name,
                workspaceId: w.id,
                status: d.lastRefresh.status || "Completed",
                timeAgo: formatRelativeTime(d.lastRefresh.startTime || d.lastRefresh.endTime),
                type: d.lastRefresh.refreshType || "Scheduled",
              });
            }
          }
        }
        setActivities(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading activity.");
      } finally {
        setLoading(false);
      }
    }
    void loadActivity();
  }, []);

  return (
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity</h1>
        <Activity className="size-5 text-[#3730a3]" />
      </div>
      <p className="text-xs text-slate-500">Recent refresh operations across your workspaces</p>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-white border border-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-rose-600 p-4">{error}</p>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-xs text-slate-400">
          No recent refresh activity found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((a) => (
            <Link
              key={a.id}
              href={`/dataset/${encodeURIComponent(a.id)}?workspaceId=${encodeURIComponent(a.workspaceId)}&workspaceName=${encodeURIComponent(a.workspaceName)}&name=${encodeURIComponent(a.name)}`}
              className="block rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm hover:border-slate-200 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 truncate">{a.name}</span>
                <span className="text-xs text-slate-400">{a.timeAgo}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">{a.workspaceName}</span>
                <StatusBadge status={a.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
