"use client";

import { useMemo, useState } from "react";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { usePinnedWorkspaces } from "@/hooks/use-pinned-workspaces";
import { buildWorkspaceRows, getTotals, matchesQuery, sortRows } from "@/app/lib/workspace-stats";
import { YellowHeroLayout } from "@/components/common/YellowHeroLayout";
import { EmptyBox, ErrorBox, WorkspaceListSkeleton } from "@/components/common/StateViews";
import { WorkspaceCard } from "./WorkspaceCard";
import { NotAdminView } from "./NotAdminView";

type Props = { getToken: () => Promise<string | null> };

export const WorkspacesListView = ({ getToken }: Props) => {
  const { workspaces, statuses, loading, statusesLoading, error, errorCode, statusMissing, reload } =
    useWorkspaceData(getToken);
  const { isPinned, toggle: togglePin } = usePinnedWorkspaces();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => buildWorkspaceRows(workspaces, statuses), [workspaces, statuses]);
  const totals = useMemo(() => getTotals(rows), [rows]);

  const visible = useMemo(() => {
    const match = matchesQuery(query);
    return sortRows(rows.filter((r) => match(r.name)));
  }, [rows, query]);

  const pinnedRows = useMemo(
    () => visible.filter((r) => isPinned(r.id)),
    [visible, isPinned]
  );

  const unpinnedRows = useMemo(
    () => visible.filter((r) => !isPinned(r.id)),
    [visible, isPinned]
  );

  const isNotAdmin =
    errorCode === "not_admin" ||
    (typeof error === "string" &&
      (error.toLowerCase().includes("not an admin") ||
        error.toLowerCase().includes("administrator") ||
        error.toLowerCase().includes("not_admin")));

  const summaryLoading = loading || statusesLoading;
  const headline = summaryLoading ? undefined : isNotAdmin ? (
    <>
      Admin access
      <br />
      required
    </>
  ) : error ? undefined : statusMissing ? (
    <>
      {totals.datasets} datasets
      <br />
      in {totals.workspaces} workspaces
    </>
  ) : totals.failed > 0 ? (
    <>
      <span className="text-rose-900">{totals.failed} failed</span>
      <br />
      of {totals.datasets} datasets
    </>
  ) : (
    <>
      {totals.datasets} datasets
      <br />
      all healthy
    </>
  );

  return (
    <YellowHeroLayout
      title="Workspaces"
      subtitle={
        summaryLoading
          ? undefined
          : isNotAdmin
            ? "Access Restricted"
            : `${totals.workspaces} workspaces · ${totals.datasets} datasets`
      }
      headline={headline}
      summaryLoading={summaryLoading}
      search={{ value: query, onChange: setQuery, placeholder: "Search workspaces" }}
      getToken={getToken}
    >
      {summaryLoading ? (
        <WorkspaceListSkeleton />
      ) : isNotAdmin ? (
        <NotAdminView message={error || undefined} onRetry={reload} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyBox
          title="No workspaces found"
          text={query ? `No workspaces matched "${query}".` : "No active workspaces were returned."}
        />
      ) : (
        <div className="space-y-4">
            {/* Pinned section */}
            {pinnedRows.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pinned
                </p>
                <div className="space-y-3">
                  {pinnedRows.map((row) => (
                    <WorkspaceCard
                      key={row.id}
                      row={row}
                      isPinned={true}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All / Unpinned section */}
            <div className="space-y-2">
              {pinnedRows.length > 0 && (
                <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  All workspaces
                </p>
              )}
              <div className="space-y-3">
                {(pinnedRows.length > 0 ? unpinnedRows : visible).map((row) => (
                  <WorkspaceCard
                    key={row.id}
                    row={row}
                    isPinned={isPinned(row.id)}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
    </YellowHeroLayout>
  );
};
