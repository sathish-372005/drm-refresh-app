"use client";

import { useMemo, useState } from "react";
import _ from "lodash";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { useDatasetRefresh } from "@/hooks/use-dataset-refresh";
import { classify, matchesQuery } from "@/app/lib/workspace-stats";
import type { HealthKind, StatusMap } from "@/app/lib/powerbi-types";
import { YellowHeroLayout } from "@/components/common/YellowHeroLayout";
import { FilterChips } from "@/components/common/FilterChips";
import { EmptyBox, ErrorBox, ListSkeleton } from "@/components/common/StateViews";
import { DatasetRow } from "@/components/dataset/DatasetRow";
import { NotAdminView } from "./NotAdminView";

const FILTERS = ["All", "Failed", "Refreshing", "Healthy"] as const;
type Filter = (typeof FILTERS)[number];

const KIND_BY_FILTER: Record<Exclude<Filter, "All">, HealthKind> = {
  Failed: "failed",
  Refreshing: "refreshing",
  Healthy: "healthy",
};
const PRIORITY: Record<HealthKind, number> = { failed: 0, refreshing: 1, healthy: 2, nodata: 3 };

type Props = { workspaceId: string; getToken: () => Promise<string | null> };

export const WorkspaceDatasetsView = ({ workspaceId, getToken }: Props) => {
  const { workspaces, statuses: bulk, loading, error, errorCode, reload } = useWorkspaceData(getToken);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const workspace = useMemo(() => _.find(workspaces, { id: workspaceId }), [workspaces, workspaceId]);
  const datasetIds = useMemo(() => (workspace?.datasets ?? []).map((d) => d.id), [workspace]);

  // latest refresh for EVERY dataset in this workspace
  const refresh = useDatasetRefresh(getToken, workspace?.id, datasetIds);

  // exact per-dataset results win over the bulk status
  const statuses: StatusMap = useMemo(
    () => ({ ...bulk, ..._.pickBy(refresh.data?.statuses, (s) => s.error === null && s.status !== null) }),
    [bulk, refresh.data]
  );

  const rows = useMemo(
    () =>
      (workspace?.datasets ?? []).map((dataset) => ({
        dataset,
        status: statuses[dataset.id]?.status ?? null,
        endTime: statuses[dataset.id]?.endTime ?? null,
        health: classify(statuses[dataset.id]),
      })),
    [workspace, statuses]
  );

  const visible = useMemo(() => {
    const match = matchesQuery(query);
    const filtered = rows.filter(
      (r) => match(r.dataset.name) && (filter === "All" || r.health === KIND_BY_FILTER[filter])
    );
    return _.orderBy(filtered, [(r) => PRIORITY[r.health], (r) => r.dataset.name.toLowerCase()], ["asc", "asc"]);
  }, [rows, query, filter]);

  const counts = _.countBy(rows, "health");
  const hasStatus = rows.some((r) => r.health !== "nodata");

  const isNotAdmin =
    errorCode === "not_admin" ||
    (typeof error === "string" &&
      (error.toLowerCase().includes("not an admin") ||
        error.toLowerCase().includes("administrator") ||
        error.toLowerCase().includes("not_admin")));

  const headline = isNotAdmin ? (
    <>
      Admin access
      <br />
      required
    </>
  ) : !workspace ? undefined : hasStatus ? (
    <>
      {counts.failed ? (
        <span className="text-rose-900">{counts.failed} failed</span>
      ) : (
        <span>{rows.length} healthy</span>
      )}
      <br />
      of {rows.length} datasets
    </>
  ) : undefined;

  const notices = [
    refresh.loading && "Loading refresh status…",
    refresh.error,
    refresh.data?.rateLimited && "Power BI limit reached. Showing partial results; try again later.",
    !!refresh.data?.noAccess && `${refresh.data.noAccess} datasets: no access to refresh data.`,
  ].filter(Boolean) as string[];

  return (
    <YellowHeroLayout
      title={workspace?.name ?? "Workspace"}
      subtitle={workspace ? `${rows.length} datasets` : undefined}
      headline={headline}
      back={{ href: "/", label: "Workspaces" }}
      search={{ value: query, onChange: setQuery, placeholder: "Search datasets" }}
      getToken={getToken}
    >
      {hasStatus && <FilterChips options={FILTERS} value={filter} onChange={setFilter} />}

      {notices.map((text) => (
        <p key={text} className="px-1 text-xs text-muted-foreground">
          {text}
        </p>
      ))}

      {loading ? (
        <ListSkeleton height="h-20" />
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
          {visible.map(({ dataset, status, endTime }) => (
            <DatasetRow
              key={dataset.id}
              dataset={dataset}
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              status={status}
              endTime={endTime}
            />
          ))}
        </div>
      )}
    </YellowHeroLayout>
  );
};
