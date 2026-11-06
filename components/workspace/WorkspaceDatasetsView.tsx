"use client";

import { useMemo, useState } from "react";
import _ from "lodash";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { useDatasetRefresh } from "@/hooks/use-dataset-refresh";
import { classify, matchesQuery } from "@/app/lib/workspace-stats";
import type { HealthKind, StatusMap } from "@/app/lib/powerbi-types";
import { YellowHeroLayout } from "@/components/common/YellowHeroLayout";
import { ChipTone, FilterChips } from "@/components/common/FilterChips";
import {
  EmptyBox,
  ErrorBox,
  FilterChipsSkeleton,
  ListSkeleton,
} from "@/components/common/StateViews";
import { DatasetRow } from "@/components/dataset/DatasetRow";
import FailedAlertBanner from "@/components/dataset/FailedAlertBanner";
import { formatRelativeTime } from "@/components/dataset/format-utils";
import { NotAdminView } from "./NotAdminView";

const FILTERS = ["Completed", "Refreshing", "Failed"] as const;
type Filter = (typeof FILTERS)[number];

const KIND_BY_FILTER: Record<Filter, HealthKind> = {
  Completed: "healthy",
  Refreshing: "refreshing",
  Failed: "failed",
};
const FILTER_TONES: Record<Filter, ChipTone> = {
  Completed: "green",
  Refreshing: "amber",
  Failed: "red",
};
const PRIORITY: Record<HealthKind, number> = { failed: 0, refreshing: 1, healthy: 2, nodata: 3 };

type Props = { workspaceId: string; getToken: () => Promise<string | null> };

export const WorkspaceDatasetsView = ({ workspaceId, getToken }: Props) => {
  const {
    workspaces,
    statuses: bulk,
    loading,
    statusesLoading,
    error,
    errorCode,
    reload,
  } = useWorkspaceData(getToken);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter | null>(null);

  const workspace = useMemo(() => _.find(workspaces, { id: workspaceId }), [workspaces, workspaceId]);
  const datasetIds = useMemo(() => (workspace?.datasets ?? []).map((d) => d.id), [workspace]);

  // latest refresh for EVERY dataset in this workspace
  const refresh = useDatasetRefresh(getToken, workspace?.id, datasetIds);

  // exact per-dataset results win over bulk status
  const statuses: StatusMap = useMemo(
    () => ({ ...bulk, ..._.pickBy(refresh.data?.statuses, (s) => s.error === null && s.status !== null) }),
    [bulk, refresh.data]
  );

  const rows = useMemo(
    () =>
      (workspace?.datasets ?? []).map((dataset) => {
        const s = statuses[dataset.id];
        return {
          dataset,
          status: s?.status ?? null,
          startTime: s?.startTime ?? null,
          endTime: s?.endTime ?? null,
          schedule: s?.schedule ?? null,
          health: classify(s),
        };
      }),
    [workspace, statuses]
  );

  const visible = useMemo(() => {
    const match = matchesQuery(query);
    const filtered = rows.filter(
      (r) => match(r.dataset.name) && (!filter || r.health === KIND_BY_FILTER[filter])
    );
    return _.orderBy(filtered, [(r) => PRIORITY[r.health], (r) => r.dataset.name.toLowerCase()], ["asc", "asc"]);
  }, [rows, query, filter]);

  const counts = _.countBy(rows, "health");
  const failedCount = counts.failed ?? 0;
  const healthyCount = counts.healthy ?? 0;
  const totalCount = rows.length;
  const refreshableCount = rows.filter((r) => r.dataset.isRefreshable !== false).length;

  const isNotAdmin =
    errorCode === "not_admin" ||
    (typeof error === "string" &&
      (error.toLowerCase().includes("not an admin") ||
        error.toLowerCase().includes("administrator") ||
        error.toLowerCase().includes("not_admin")));

  // Headline like the old UI: "6 of 12 datasets healthy" or "1 of 12 datasets failed"
  const headline = isNotAdmin ? (
    <>
      Admin access
      <br />
      required
    </>
  ) : !workspace || totalCount === 0 ? undefined : failedCount > 0 ? (
    <>
      <span className="text-rose-900">{failedCount}</span> of {totalCount}
      <br />
      datasets failed
    </>
  ) : (
    <>
      {healthyCount} of {totalCount}
      <br />
      datasets healthy
    </>
  );

  // Failed alert banner for the most recently failed dataset
  const failedRow = useMemo(() => {
    return rows.find((r) => r.health === "failed");
  }, [rows]);

  const notices = [
    refresh.loading && "Loading refresh status…",
    refresh.error,
    refresh.data?.rateLimited && "Power BI limit reached. Showing partial results; try again later.",
    !!refresh.data?.noAccess && `${refresh.data.noAccess} datasets: no access to refresh data.`,
  ].filter(Boolean) as string[];

  const chipCounts = {
    Completed: counts.healthy ?? 0,
    Refreshing: counts.refreshing ?? 0,
    Failed: counts.failed ?? 0,
  };
  const summaryLoading =
    loading ||
    statusesLoading ||
    (!workspace && !error) ||
    (datasetIds.length > 0 && (refresh.loading || (!refresh.data && !refresh.error)));

  return (
    <YellowHeroLayout
      title={workspace?.name ?? "Datasets"}
      subtitle={
        summaryLoading
          ? undefined
          : isNotAdmin
            ? "Access Restricted"
            : workspace
              ? `${totalCount} ${totalCount === 1 ? "dataset" : "datasets"} · updated just now`
              : undefined
      }
      headline={headline}
      summaryLoading={summaryLoading}
      back={{ href: "/", label: "Workspaces" }}
      search={{ value: query, onChange: setQuery, placeholder: "Search datasets or workspaces" }}
      getToken={getToken}
    >
      {/* Filter Pills with Power BI Yellow active state */}
      {summaryLoading ? (
        <FilterChipsSkeleton />
      ) : (
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          counts={chipCounts}
          tones={FILTER_TONES}
        />
      )}

      {/* Failed Alert Banner */}
      {!summaryLoading && failedRow && (
        <FailedAlertBanner
          failedCount={failedCount || 1}
          datasetName={failedRow.dataset.name}
          timeAgo={formatRelativeTime(failedRow.startTime || failedRow.endTime || undefined)}
          datasetId={failedRow.dataset.id}
          workspaceId={workspace?.id}
          workspaceName={workspace?.name}
        />
      )}

      {notices.map((text) => (
        <p key={text} className="px-1 text-xs text-muted-foreground">
          {text}
        </p>
      ))}

      {summaryLoading ? (
        <ListSkeleton height="h-24" />
      ) : isNotAdmin ? (
        <NotAdminView message={error || undefined} onRetry={reload} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !workspace ? (
        <EmptyBox title="Workspace not found" text="It may have been removed or is not active." />
      ) : visible.length === 0 ? (
        <EmptyBox
          title="No datasets found"
          text={query ? `No datasets matched "${query}".` : "This workspace has no datasets."}
        />
      ) : (
        <div className="space-y-3">
          {visible.map(({ dataset, status, startTime, endTime, schedule }) => (
            <DatasetRow
              key={dataset.id}
              dataset={dataset}
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              status={status}
              startTime={startTime}
              endTime={endTime}
              schedule={schedule}
            />
          ))}
        </div>
      )}
    </YellowHeroLayout>
  );
};
