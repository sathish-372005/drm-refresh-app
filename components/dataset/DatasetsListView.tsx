"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, Database } from "lucide-react";
import DatasetCard from "./DatasetCard";
import DatasetSearchAndFilter, { FilterCategory } from "./DatasetSearchAndFilter";
import FailedAlertBanner from "./FailedAlertBanner";
import { formatRelativeTime } from "./format-utils";
import { DatasetsResponse, DatasetItem } from "./types";

const API_URL = "/api/powerbi/datasets";

type Props = {
  getToken: () => Promise<string | null>;
};

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
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flatten datasets with workspace info
  const allDatasets = useMemo(() => {
    if (!data?.workspaces) return [];
    return data.workspaces.flatMap((w) =>
      w.datasets.map((d) => ({
        ...d,
        workspaceId: w.id,
        workspaceName: w.name,
      }))
    );
  }, [data]);

  // Find if any dataset failed today
  const failedDataset = useMemo(() => {
    const failed = allDatasets.find((d) => {
      const status = d.lastRefresh?.status?.toLowerCase();
      return status === "failed" || status === "disabled";
    });
    if (!failed) return null;
    return {
      id: failed.id,
      name: failed.name,
      timeAgo: formatRelativeTime(failed.lastRefresh?.startTime || failed.lastRefresh?.endTime),
      workspaceId: failed.workspaceId,
      workspaceName: failed.workspaceName,
    };
  }, [allDatasets]);

  // Filter datasets by search query and category
  const filteredDatasets = useMemo(() => {
    let result = allDatasets;

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.workspaceName.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (activeFilter === "Failed") {
      result = result.filter((d) => {
        const s = d.lastRefresh?.status?.toLowerCase();
        return s === "failed" || s === "disabled";
      });
    } else if (activeFilter === "Refreshing") {
      result = result.filter((d) => {
        const s = d.lastRefresh?.status?.toLowerCase();
        return s === "refreshing" || s === "inprogress";
      });
    } else if (activeFilter === "Healthy") {
      result = result.filter((d) => {
        const s = d.lastRefresh?.status?.toLowerCase();
        return s === "completed" || s === "healthy" || !s;
      });
    }

    return result;
  }, [allDatasets, searchQuery, activeFilter]);

  const refreshableCount = allDatasets.filter((d) => d.isRefreshable !== false).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Datasets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {refreshableCount} refreshable · updated {formatRelativeTime(lastFetched.toISOString())}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDatasets()}
          disabled={loading}
          aria-label="Refresh datasets list"
          className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-[#F2C811] hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
        >
          <RotateCw className={`size-4 ${loading ? "animate-spin text-[#A16207]" : ""}`} />
        </button>
      </div>

      {/* Search and Filters */}
      <DatasetSearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Failed Alert Banner */}
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

      {/* Datasets List */}
      <div className="space-y-3 pt-1">
        {loading && !data ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-2">
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-10 text-center space-y-2">
            <Database className="mx-auto size-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No datasets found</p>
            <p className="text-xs text-slate-400">
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
    </div>
  );
}
