import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import _ from "lodash";
import { fetchDatasetRefresh, fetchStatuses, fetchWorkspaces } from "@/app/lib/workspace-api";
import { buildWorkspaceRows, getTotals } from "@/app/lib/workspace-stats";
import type { RefreshState, StatusMap, Workspace, WorkspaceRow } from "@/app/lib/powerbi-types";

const WORKSPACES_STALE_MS = 2 * 60_000; // 2 minutes SWR
const STATUSES_STALE_MS = 60_000; // 1 minute SWR
const WORKSPACE_BATCH_SIZE = 4;

type GetToken = () => Promise<string | null>;

interface PowerBiStoreState {
  workspaces: Workspace[];
  statuses: StatusMap;
  workspacesLoadedAt: number | null;
  workspaceStatusesLoadedAt: Record<string, number>;
  loadingWorkspaces: boolean;
  backgroundUpdating: boolean;
  error: string | null;
  errorCode: string | null;

  // Actions
  fetchWorkspaces: (getToken: GetToken, force?: boolean) => Promise<void>;
  fetchWorkspaceRefreshes: (getToken: GetToken, workspaceId: string, force?: boolean) => Promise<void>;
  updateDatasetStatus: (datasetId: string, patch: Partial<RefreshState>) => void;
  invalidateCache: () => void;

  // Derived helpers
  getWorkspaceRows: () => WorkspaceRow[];
  getTotals: () => { workspaces: number; datasets: number; failed: number };
}

const messageOf = (reason: unknown): string =>
  reason instanceof Error ? reason.message : "Something went wrong.";

const safeStorage = createJSONStorage(() => {
  if (typeof window !== "undefined") {
    try {
      return window.sessionStorage;
    } catch {
      // Fallback for private browsing or restricted environments
    }
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
});

export const usePowerBiStore = create<PowerBiStoreState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      statuses: {},
      workspacesLoadedAt: null,
      workspaceStatusesLoadedAt: {},
      loadingWorkspaces: false,
      backgroundUpdating: false,
      error: null,
      errorCode: null,

      fetchWorkspaces: async (getToken: GetToken, force = false) => {
        const { workspaces, workspacesLoadedAt, loadingWorkspaces } = get();
        const now = Date.now();

        // SWR Cache Hit: If data is fresh and already loaded, skip re-fetching
        const isFresh = workspacesLoadedAt && now - workspacesLoadedAt < WORKSPACES_STALE_MS;
        if (!force && isFresh && workspaces.length > 0) {
          return;
        }

        // Prevent duplicate in-flight requests
        if (loadingWorkspaces) return;

        // If we already have cached workspaces, do a silent background update instead of showing a skeleton
        const hasCachedData = workspaces.length > 0;
        set({
          loadingWorkspaces: !hasCachedData,
          backgroundUpdating: hasCachedData,
          error: null,
          errorCode: null,
        });

        try {
          const [workspacesResult, statusesResult] = await Promise.allSettled([
            fetchWorkspaces(getToken, force),
            fetchStatuses(getToken, force),
          ]);

          const isWsRejected = workspacesResult.status === "rejected";
          const wsReason = isWsRejected ? workspacesResult.reason : null;
          const errorMsg = isWsRejected ? messageOf(wsReason) : null;
          const lower = (errorMsg || "").toLowerCase();
          const errorCode =
            (wsReason as any)?.code ||
            (lower.includes("not an admin") ||
            lower.includes("administrator") ||
            lower.includes("not_admin")
              ? "not_admin"
              : null);

          if (isWsRejected) {
            set({
              loadingWorkspaces: false,
              backgroundUpdating: false,
              error: errorMsg,
              errorCode,
            });
            return;
          }

          const fetchedWorkspaces = workspacesResult.value;
          const initStatuses: StatusMap =
            statusesResult.status === "fulfilled" ? statusesResult.value : {};

          // Immediately render workspaces with any initial capacity statuses
          set((state) => ({
            workspaces: fetchedWorkspaces,
            statuses: { ...state.statuses, ...initStatuses },
            workspacesLoadedAt: Date.now(),
            loadingWorkspaces: false,
            backgroundUpdating: false,
            error: null,
            errorCode: null,
          }));

          // Background progressive resolution for workspaces with datasets
          const workspacesWithDatasets = fetchedWorkspaces.filter(
            (w) => w.datasets && w.datasets.length > 0
          );

          if (workspacesWithDatasets.length > 0) {
            const batches = _.chunk(workspacesWithDatasets, WORKSPACE_BATCH_SIZE);

            batches
              .reduce(
                (chain, batch) =>
                  chain.then(async () => {
                    const results = await Promise.allSettled(
                      batch.map((w) =>
                        fetchDatasetRefresh(
                          getToken,
                          w.id,
                          w.datasets.map((d) => d.id),
                          force
                        )
                      )
                    );

                    const batchStatuses: StatusMap = {};
                    const nowLoaded = Date.now();
                    const newLoadedTimestamps: Record<string, number> = {};
                    let isRateLimited = false;

                    results.forEach((res, idx) => {
                      const ws = batch[idx];
                      if (res.status === "fulfilled" && res.value) {
                        if (res.value.rateLimited) isRateLimited = true;
                        if (ws) newLoadedTimestamps[ws.id] = nowLoaded;
                        Object.entries(res.value.statuses).forEach(([id, st]) => {
                          if (st && st.error === null && st.status !== null) {
                            batchStatuses[id] = st;
                          }
                        });
                      }
                    });

                    if (!_.isEmpty(batchStatuses) || !_.isEmpty(newLoadedTimestamps)) {
                      set((state) => ({
                        statuses: { ...state.statuses, ...batchStatuses },
                        workspaceStatusesLoadedAt: {
                          ...state.workspaceStatusesLoadedAt,
                          ...newLoadedTimestamps,
                        },
                      }));
                    }

                    if (isRateLimited) {
                      throw new Error("rate_limited");
                    }
                  }),
                Promise.resolve()
              )
              .catch(() => {
                // Silently stop background resolution on rate limit
              });
          }
        } catch (err) {
          set({
            loadingWorkspaces: false,
            backgroundUpdating: false,
            error: messageOf(err),
          });
        }
      },

      fetchWorkspaceRefreshes: async (getToken: GetToken, workspaceId: string, force = false) => {
        const { workspaces, workspaceStatusesLoadedAt } = get();
        const ws = _.find(workspaces, { id: workspaceId });
        if (!ws || !ws.datasets || ws.datasets.length === 0) return;

        const now = Date.now();
        const lastLoaded = workspaceStatusesLoadedAt[workspaceId];
        if (!force && lastLoaded && now - lastLoaded < STATUSES_STALE_MS) {
          return; // Cache hit: already loaded and fresh
        }

        try {
          const result = await fetchDatasetRefresh(
            getToken,
            workspaceId,
            ws.datasets.map((d) => d.id),
            force
          );

          const newStatuses: StatusMap = {};
          Object.entries(result.statuses).forEach(([id, st]) => {
            if (st && st.error === null && st.status !== null) {
              newStatuses[id] = st;
            }
          });

          set((state) => ({
            statuses: { ...state.statuses, ...newStatuses },
            workspaceStatusesLoadedAt: {
              ...state.workspaceStatusesLoadedAt,
              [workspaceId]: Date.now(),
            },
          }));
        } catch {
          // Ignore background refresh errors
        }
      },

      updateDatasetStatus: (datasetId: string, patch: Partial<RefreshState>) => {
        set((state) => {
          const existing = state.statuses[datasetId] ?? {
            status: null,
            startTime: null,
            endTime: null,
          };
          return {
            statuses: {
              ...state.statuses,
              [datasetId]: { ...existing, ...patch },
            },
          };
        });
      },

      invalidateCache: () => {
        set({
          workspacesLoadedAt: null,
          workspaceStatusesLoadedAt: {},
        });
      },

      getWorkspaceRows: () => {
        const { workspaces, statuses } = get();
        return buildWorkspaceRows(workspaces, statuses);
      },

      getTotals: () => {
        const { workspaces, statuses } = get();
        const rows = buildWorkspaceRows(workspaces, statuses);
        return getTotals(rows);
      },
    }),
    {
      name: "powerbi-store-v1",
      storage: safeStorage,
      partialize: (state) => ({
        workspaces: state.workspaces,
        statuses: state.statuses,
        workspacesLoadedAt: state.workspacesLoadedAt,
        workspaceStatusesLoadedAt: state.workspaceStatusesLoadedAt,
      }),
    }
  )
);
