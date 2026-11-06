import countBy from "lodash/countBy";
import orderBy from "lodash/orderBy";
import sumBy from "lodash/sumBy";
import type { HealthKind, RefreshState, StatusMap, Workspace, WorkspaceRow } from "./powerbi-types";

export const classify = (state?: RefreshState): HealthKind => {
  const s = state?.status?.toLowerCase();
  if (!s) return "nodata";
  if (s === "failed" || s === "disabled") return "failed";
  if (s === "unknown" || s === "refreshing" || s === "inprogress") return "refreshing"; // Power BI "Unknown" = in progress
  return "healthy";
};

export const buildWorkspaceRows = (workspaces: Workspace[], statuses: StatusMap): WorkspaceRow[] =>
  workspaces.map(({ id, name, datasets }) => {
    const counts = countBy(datasets, (d) => classify(statuses[d.id]));
    return {
      id,
      name,
      total: datasets.length,
      failed: counts.failed ?? 0,
      refreshing: counts.refreshing ?? 0,
      healthy: counts.healthy ?? 0,
      nodata: counts.nodata ?? 0,
    };
  });

// workspaces with failures first, then by name
export const sortRows = (rows: WorkspaceRow[]) =>
  orderBy(rows, [(r) => r.failed, (r) => r.name.toLowerCase()], ["desc", "asc"]);

export const getTotals = (rows: WorkspaceRow[]) => ({
  workspaces: rows.length,
  datasets: sumBy(rows, "total"),
  failed: sumBy(rows, "failed"),
});

export const matchesQuery = (query: string) => {
  const q = query.trim().toLowerCase();
  return (text: string) => !q || text.toLowerCase().includes(q);
};

