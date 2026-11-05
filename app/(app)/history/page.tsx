"use client";

import { useEffect, useMemo, useState } from "react";
import { getAppToken } from "@/app/lib/auth-client";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "@/components/dataset/format-utils";
import StatusBadge from "@/components/dataset/StatusBadge";
import Link from "next/link";

type DatasetActivity = {
  id: string;
  name: string;
  workspaceName: string;
  workspaceId: string;
  status: string;
  time: number; // epoch ms, -1 when unknown (parsed once)
  timeAgo: string;
};

type ActivityGroup = { key: string; label: string; items: DatasetActivity[] };

type ApiResponse = {
  workspaces?: {
    id: string;
    name: string;
    datasets?: {
      id: string;
      name: string;
      lastRefresh?: { status?: string; startTime?: string; endTime?: string };
    }[];
  }[];
};

// Created once, not on every item
const DATE_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const DATE_FMT_YEAR = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function parseTime(value?: string): number {
  if (!value) return -1;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? -1 : t;
}

function groupByDay(items: DatasetActivity[]): ActivityGroup[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(yesterday);

  const groups = new Map<string, ActivityGroup>();
  for (const item of items) {
    let key = "unknown";
    let date: Date | null = null;
    if (item.time >= 0) {
      date = new Date(item.time);
      key = dayKey(date);
    }

    let group = groups.get(key);
    if (!group) {
      // the label is built once per day, not once per item
      const label =
        !date ? "Date unknown"
        : key === todayKey ? "Today"
        : key === yesterdayKey ? "Yesterday"
        : (date.getFullYear() !== now.getFullYear() ? DATE_FMT_YEAR : DATE_FMT).format(date);
      group = { key, label, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(groups.values());
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<DatasetActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  // items are already sorted newest-first, so grouping is a single pass
  const activityGroups = useMemo(() => groupByDay(activities), [activities]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadActivity() {
      try {
        setLoading(true);
        setError(null);

        const token = await getAppToken();
        if (!token) throw new Error("Please sign in to view activity.");

        const res = await fetch("/api/powerbi/datasets", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load activity.");
        const data: ApiResponse = await res.json();

        const items: DatasetActivity[] = (data.workspaces ?? []).flatMap((w) =>
          (w.datasets ?? []).flatMap((d) => {
            if (!d.lastRefresh) return [];
            const refreshDate = d.lastRefresh.startTime || d.lastRefresh.endTime;
            return [
              {
                id: d.id,
                name: d.name,
                workspaceName: w.name,
                workspaceId: w.id,
                status: d.lastRefresh.status || "Completed",
                time: parseTime(refreshDate),
                timeAgo: formatRelativeTime(refreshDate),
              },
            ];
          })
        );

        items.sort((a, b) => b.time - a.time); // dates parsed once; unknown (-1) go last
        setActivities(items);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Error loading activity.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadActivity();
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 bg-background p-4 pb-20 pt-6 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity</h1>
        <Activity className="size-5 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground">Recent refresh operations across your workspaces</p>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <p className="p-4 text-xs text-rose-600">{error}</p>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
          No recent refresh activity found.
        </div>
      ) : (
        <div className="space-y-5">
          {activityGroups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-2 text-sm font-semibold text-foreground">{group.label}</h2>
              <div className="space-y-2.5">
                {group.items.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dataset/${encodeURIComponent(a.id)}?workspaceId=${encodeURIComponent(a.workspaceId)}&workspaceName=${encodeURIComponent(a.workspaceName)}&name=${encodeURIComponent(a.name)}`}
                    className="block rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:border-primary/70"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-card-foreground">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.timeAgo}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{a.workspaceName}</span>
                      <StatusBadge status={a.status} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}