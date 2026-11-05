"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RotateCw, Clock, AlertTriangle, Loader2 } from "lucide-react";
import RefreshHistoryRow from "./RefreshHistoryRow";
import ErrorAccordion from "./ErrorAccordion";
import { formatRelativeTime, formatScheduleSummary } from "./format-utils";
import { RefreshRun, RefreshSchedule } from "./types";

type Props = {
  datasetId: string;
  datasetName?: string;
  workspaceId?: string;
  workspaceName?: string;
  getToken: () => Promise<string | null>;
};

export default function DatasetDetailView({
  datasetId,
  datasetName = "Dataset Details",
  workspaceId = "",
  workspaceName = "Workspace",
  getToken,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshes, setRefreshes] = useState<RefreshRun[]>([]);
  const [schedule, setSchedule] = useState<RefreshSchedule | null>(null);
  const [datasetMeta, setDatasetMeta] = useState<Record<string, unknown> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setFetchError(null);
      const token = await getToken();
      if (!token) {
        setFetchError("Please sign in to view refresh history.");
        return;
      }

      const params = new URLSearchParams();
      if (workspaceId) params.set("workspaceId", workspaceId);
      params.set("top", "15");

      const res = await fetch(
        `/api/powerbi/datasets/${encodeURIComponent(datasetId)}/refreshes?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to load history (HTTP ${res.status})`);
      }

      const data = await res.json();
      setRefreshes(data.refreshes || []);
      setSchedule(data.schedule || null);
      setDatasetMeta(data.dataset || null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unable to load refresh history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, workspaceId]);

  async function handleRefreshNow() {
    try {
      setRefreshing(true);
      setActionSuccess(null);
      setActionError(null);
      const token = await getToken();
      if (!token) throw new Error("Please sign in to trigger refreshes.");

      const params = new URLSearchParams();
      if (workspaceId) params.set("workspaceId", workspaceId);

      const res = await fetch(
        `/api/powerbi/datasets/${encodeURIComponent(datasetId)}/refreshes?${params.toString()}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Failed to trigger refresh.");
      }

      setActionSuccess("Refresh triggered successfully! It will appear shortly.");
      // Reload history after short delay
      setTimeout(() => {
        void loadData();
      }, 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error triggering refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  const latestRun = refreshes[0];
  const isLatestFailed =
    latestRun?.status?.toLowerCase() === "failed" ||
    latestRun?.status?.toLowerCase() === "disabled";
  const failedTimeAgo = latestRun ? formatRelativeTime(latestRun.endTime || latestRun.startTime) : "";

  // Metadata items
  const storageMode =
    typeof datasetMeta?.targetStorageMode === "string"
      ? datasetMeta.targetStorageMode
      : "Import";
  const owner =
    typeof datasetMeta?.configuredBy === "string"
      ? datasetMeta.configuredBy
      : "Current User";

  return (
    <div className="space-y-5 pb-8 overflow-hidden">
      {/* Top Bar: Back to Datasets */}
      <div>
        <Link
          href="/dataset"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Datasets</span>
        </Link>
      </div>

      {/* Dataset Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {datasetName}
        </h1>

        {/* 3-Column Metadata */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-b border-border pb-4 text-left">
          <div>
            <p className="truncate text-sm font-semibold text-foreground">
              {workspaceName}
            </p>
            <p className="text-xs text-muted-foreground">workspace</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {storageMode}
            </p>
            <p className="text-xs text-muted-foreground">mode</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Owner:</p>
            <p className="truncate text-xs font-medium text-foreground" title={owner}>
              {owner}
            </p>
          </div>
        </div>
      </div>

      {/* Top Failure Alert Card with Accordion */}
      {isLatestFailed && (
        <div className="space-y-2.5 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left dark:border-rose-900 dark:bg-rose-950/40">
          <div className="flex items-center gap-2 text-sm font-bold text-[#be123c]">
            <AlertTriangle className="size-4 shrink-0 stroke-[2.5]" />
            <span>Last refresh failed · {failedTimeAgo}</span>
          </div>
          <ErrorAccordion error={latestRun.errorMessage} defaultOpen={true} />
        </div>
      )}

      {/* Action Notifications */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {actionError}
        </div>
      )}

      {/* Action Buttons styled with Power BI Signature Yellow */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRefreshNow}
          disabled={refreshing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#F2C811] hover:bg-[#E5B800] text-[#18181B] py-2.5 px-4 text-sm font-bold shadow-sm shadow-[#F2C811]/30 active:scale-[0.98] transition disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin text-[#18181B]" />
          ) : (
            <RotateCw className="size-4 text-[#18181B]" />
          )}
          <span>{refreshing ? "Triggering…" : "Refresh now"}</span>
        </button>

        <a
          href={
            typeof datasetMeta?.webUrl === "string"
              ? datasetMeta.webUrl
              : "https://app.powerbi.com"
          }
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow-sm transition hover:border-primary hover:bg-muted active:scale-[0.98]"
        >
          <Clock className="size-4 text-muted-foreground" />
          <span>Edit schedule</span>
        </a>
      </div>

      {/* Schedule Summary Text */}
      <p className="text-left text-xs text-muted-foreground">
        {formatScheduleSummary(schedule)}
      </p>

      {/* Refresh History Section */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Refresh history</h2>
          <span className="text-xs font-medium text-muted-foreground">Most recent runs</span>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-center dark:border-rose-900 dark:bg-rose-950/40">
            <p className="text-xs font-medium text-rose-700">{fetchError}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-2 text-xs font-bold text-[#B45309] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : refreshes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No refresh history recorded yet for this dataset.
          </div>
        ) : (
          <div className="space-y-2.5">
            {refreshes.map((run) => (
              <RefreshHistoryRow key={String(run.id)} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
