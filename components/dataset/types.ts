export type RefreshStatus = "Completed" | "Failed" | "Refreshing" | "InProgress" | "Unknown";

export type FilterCategory = "All" | "Failed" | "Refreshing" | "Healthy";

export type RefreshRun = {
  id: string | number;
  refreshType: "Scheduled" | "ViaApi" | string;
  startTime?: string;
  endTime?: string;
  status: RefreshStatus | string;
  durationText?: string;
  errorMessage?: string | null;
  errorCode?: string | null;
  errorDetail?: string | null;
};

export type RefreshSchedule = {
  enabled?: boolean;
  days?: string[];
  times?: string[];
  localTimeZoneId?: string;
};

export type DatasetItem = {
  id: string;
  name: string;
  configuredBy?: string | null;
  webUrl?: string;
  isRefreshable?: boolean;
  targetStorageMode?: string;
  createdDate?: string;
  lastRefresh?: {
    status: RefreshStatus | string;
    startTime?: string;
    endTime?: string;
    refreshType?: string;
    serviceExceptionJson?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  } | null;
  schedule?: RefreshSchedule | null;
};

export type WorkspaceGroup = {
  id: string;
  name: string;
  datasetCount: number;
  datasets: DatasetItem[];
};

export type DatasetsResponse = {
  totalWorkspaces: number;
  totalDatasets: number;
  workspaces: WorkspaceGroup[];
};
