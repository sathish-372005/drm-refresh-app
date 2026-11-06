export type WorkspaceDataset = {
  id: string;
  name: string;
  configuredBy: string | null;
  isRefreshable: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  capacityId: string | null;
  datasets: WorkspaceDataset[];
};

export type WorkspaceListResponse = {
  workspaces: Workspace[];
  top: number;
  skip: number;
  hasMore: boolean;
};

export type RefreshState = { status: string | null; endTime: string | null };
export type StatusMap = Record<string, RefreshState>;
export type StatusResponse = { statuses: StatusMap };

export type DatasetRefreshResponse = {
  statuses: Record<string, RefreshState & { error: number | null }>;
  rateLimited: boolean;
  noAccess: number;
};

export type HealthKind = "failed" | "refreshing" | "healthy" | "nodata";

export type WorkspaceRow = {
  id: string;
  name: string;
  total: number;
  failed: number;
  refreshing: number;
  healthy: number;
  nodata: number;
};

