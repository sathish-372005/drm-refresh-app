"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Database, Search } from "lucide-react";
import DatasetCard from "./DatasetCard";
import { FilterCategory } from "./DatasetSearchAndFilter";
import FailedAlertBanner from "./FailedAlertBanner";
import { formatRelativeTime } from "./format-utils";
import { DatasetsResponse, DatasetItem } from "./types";
import UserMenu from "../custom/usermenu";

const API_URL = "/api/powerbi/datasets";
const FILTERS: FilterCategory[] = ["All", "Failed", "Refreshing", "Healthy"];

type Props = {
  getToken: () => Promise<string | null>;
};

// One place that decides what each status means (used by filters + counts)
const isFailed = (s?: string) => s === "failed" || s === "disabled";
const isRefreshing = (s?: string) => s === "refreshing" || s === "inprogress";
const isHealthy = (s?: string) => s === "completed" || s === "healthy" || !s;

export default function DatasetsListView({ getToken }: Props) {
  const [data, setData] = useState<DatasetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const [lastFetched, setLastFetched] = useState<Date>(new Date());

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  async function loadDatasets() {
    try {
      const token = await getTokenRef.current();
      setError(null);
      if (!token) throw new Error("Please sign in to view your datasets.");

      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || `Request failed (HTTP ${response.status})`);
      }

      setData(body);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load datasets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  const allDatasets = useMemo(() => {
    if (!data?.workspaces) return [];
    return data.workspaces.flatMap((w) =>
      w.datasets.map((d) => ({ ...d, workspaceId: w.id, workspaceName: w.name }))
    );
  }, [data]);

  // NEW: healthy / total counts for the yellow headline
  const healthyCount = useMemo(
    () => allDatasets.filter((d) => isHealthy(d.lastRefresh?.status?.toLowerCase())).length,
    [allDatasets]
  );
  const totalCount = allDatasets.length;

  const failedDataset = useMemo(() => {
    const failed = allDatasets.find((d) => isFailed(d.lastRefresh?.status?.toLowerCase()));
    if (!failed) return null;
    return {
      id: failed.id,
      name: failed.name,
      timeAgo: formatRelativeTime(failed.lastRefresh?.startTime || failed.lastRefresh?.endTime),
      workspaceId: failed.workspaceId,
      workspaceName: failed.workspaceName,
    };
  }, [allDatasets]);

  const filteredDatasets = useMemo(() => {
    let result = allDatasets;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.workspaceName.toLowerCase().includes(q)
      );
    }

    const status = (d: (typeof allDatasets)[number]) => d.lastRefresh?.status?.toLowerCase();
    if (activeFilter === "Failed") result = result.filter((d) => isFailed(status(d)));
    else if (activeFilter === "Refreshing") result = result.filter((d) => isRefreshing(status(d)));
    else if (activeFilter === "Healthy") result = result.filter((d) => isHealthy(status(d)));

    return result;
  }, [allDatasets, searchQuery, activeFilter]);

  const refreshableCount = allDatasets.filter((d) => d.isRefreshable !== false).length;

  return (
    <div className="flex flex-1 flex-col">
      {/* ───────── Yellow hero ───────── */}
      {/* -mx-4 cancels the page's horizontal padding so the yellow touches the edges. */}
      <section className="-mx-4 bg-[#F2C811] px-5 pb-14 pt-5 text-[#1F1E1D]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Datasets</h1>
            <p className="mt-0.5 text-xs text-[#3B3A39]">
              {refreshableCount} refreshable · updated {formatRelativeTime(lastFetched.toISOString())}
            </p>
          </div>

          <UserMenu getToken={getToken} />
        </div>

        {/* Healthy headline (hidden until data is loaded) */}
        {data && totalCount > 0 && (
          <p className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tight">
            {healthyCount} of {totalCount}
            <br />
            datasets healthy
          </p>
        )}

        {/* Search bar inside the yellow area */}
        <label className="relative mt-5 block">
          <span className="sr-only">Search datasets or workspaces</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets or workspaces"
            className="h-12 w-full rounded-full border-0 bg-card pl-11 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </section>

      {/* ───────── White sheet ───────── */}
      <section className="relative -mx-4 -mt-8 flex-1 space-y-4 rounded-t-[28px] bg-background px-4 pb-6 pt-5">
        {/* Filter chips */}
        {/* Filter Pills with Power BI Yellow active state */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-sm ${isActive
                    ? "bg-[#F2C811] text-[#18181B] font-bold shadow-sm shadow-[#F2C811]/30 border border-[#E5B800]"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {failedDataset && (
          <FailedAlertBanner
            failedCount={1}
            datasetName={failedDataset.name}
            timeAgo={failedDataset.timeAgo}
            datasetId={failedDataset.id}
            workspaceId={failedDataset.workspaceId}
            workspaceName={failedDataset.workspaceName}
          />
        )}

        <div className="space-y-3 pt-1">
          {loading && !data ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-2xl border border-border bg-card shadow-sm" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => void loadDatasets()}
                className="text-xs font-bold text-[#A16207] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Database className="mx-auto size-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No datasets found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? `No datasets matched "${searchQuery}".`
                  : "No datasets are configured for this view."}
              </p>
            </div>
          ) : (
            filteredDatasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset as DatasetItem}
                workspaceId={dataset.workspaceId}
                workspaceName={dataset.workspaceName}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}