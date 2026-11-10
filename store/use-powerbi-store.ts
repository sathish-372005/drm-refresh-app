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

// Never throws, even if Teams blocks or limits sessionStorage
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") return noopStorage;
  try {
    const s = window.sessionStorage;
    return {
      getItem: (key: string) => {
        try {
          return s.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          s.setItem(key, value);
        } catch {
          // quota or blocked: ignore
        }
      },
      removeItem: (key: string) => {
        try {
          s.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return noopStorage;
  }
});

// Real duplicate-request guard (the loading flag must NOT be used for this)
let inFlight: Promise<void> | null = null;

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
        const { workspaces, workspacesLoadedAt } = get();
        const isFresh =
          workspacesLoadedAt !== null && Date.now() - workspacesLoadedAt < WORKSPACES_STALE_MS;

        // SWR cache hit: fresh data already loaded
        if (!force && isFresh && workspaces.length > 0) return;

        // Join the request already running instead of starting another
        if (inFlight) return inFlight;

        inFlight = (async () => {
          set({
            loadingWorkspaces: true,
            backgroundUpdating: get().workspaces.length > 0,
            error: null,
            errorCode: null,
          });

          try {
            const [workspacesResult, statusesResult] = await Promise.allSettled([
              fetchWorkspaces(getToken, force),
              fetchStatuses(getToken, force),
            ]);

            if (workspacesResult.status === "rejected") {
              const wsReason: unknown = workspacesResult.reason;
              const errorMsg = messageOf(wsReason);
              const lower = errorMsg.toLowerCase();
              const errorCode =
                (typeof wsReason === "object" && wsReason !== null && "code" in wsReason
                  ? String((wsReason as { code: unknown }).code)
                  : null) ||
                (lower.includes("not an admin") ||
                lower.includes("administrator") ||
                lower.includes("not_admin")
                  ? "not_admin"
                  : null);

              set({ error: errorMsg, errorCode });
              return;
            }

            const fetchedWorkspaces = workspacesResult.value;
            const initStatuses: StatusMap =
              statusesResult.status === "fulfilled" ? statusesResult.value : {};

            // Render workspaces immediately with whatever capacity statuses exist
            set((state) => ({
              workspaces: fetchedWorkspaces,
              statuses: { ...state.statuses, ...initStatuses },
              workspacesLoadedAt: Date.now(),
              error: null,
              errorCode: null,
            }));

            // Progressive per-dataset resolution for workspaces that have datasets
            const workspacesWithDatasets = fetchedWorkspaces.filter(
              (w) => w.datasets && w.datasets.length > 0
            );

            for (const batch of _.chunk(workspacesWithDatasets, WORKSPACE_BATCH_SIZE)) {
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
              const loadedAt: Record<string, number> = {};
              const stamp = Date.now();
              let rateLimited = false;

              results.forEach((res, idx) => {
                const ws = batch[idx];
                if (res.status !== "fulfilled" || !res.value) return;
                if (res.value.rateLimited) rateLimited = true;
                if (ws) loadedAt[ws.id] = stamp;
                Object.entries(res.value.statuses).forEach(([id, st]) => {
                  if (st && st.error === null && st.status !== null) batchStatuses[id] = st;
                });
              });

              if (!_.isEmpty(batchStatuses) || !_.isEmpty(loadedAt)) {
                set((state) => ({
                  statuses: { ...state.statuses, ...batchStatuses },
                  workspaceStatusesLoadedAt: { ...state.workspaceStatusesLoadedAt, ...loadedAt },
                }));
              }

              if (rateLimited) break;
            }
          } catch (err) {
            set({ error: messageOf(err) });
          } finally {
            set({ loadingWorkspaces: false, backgroundUpdating: false });
            inFlight = null;
          }
        })();

        return inFlight;
      },

      fetchWorkspaceRefreshes: async (getToken: GetToken, workspaceId: string, force = false) => {
        const { workspaces, workspaceStatusesLoadedAt } = get();
        const ws = _.find(workspaces, { id: workspaceId });
        if (!ws || !ws.datasets || ws.datasets.length === 0) return;

        const lastLoaded = workspaceStatusesLoadedAt[workspaceId];
        if (!force && lastLoaded && Date.now() - lastLoaded < STATUSES_STALE_MS) return;

        try {
          const result = await fetchDatasetRefresh(
            getToken,
            workspaceId,
            ws.datasets.map((d) => d.id),
            force
          );

          const newStatuses: StatusMap = {};
          Object.entries(result.statuses).forEach(([id, st]) => {
            if (st && st.error === null && st.status !== null) newStatuses[id] = st;
          });

          set((state) => ({
            statuses: { ...state.statuses, ...newStatuses },
            workspaceStatusesLoadedAt: {
              ...state.workspaceStatusesLoadedAt,
              [workspaceId]: Date.now(),
            },
          }));
        } catch {
          // ignore background refresh errors
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
            statuses: { ...state.statuses, [datasetId]: { ...existing, ...patch } },
          };
        });
      },

      invalidateCache: () => {
        set({ workspacesLoadedAt: null, workspaceStatusesLoadedAt: {} });
      },

      getWorkspaceRows: () => {
        const { workspaces, statuses } = get();
        return buildWorkspaceRows(workspaces, statuses);
      },

      getTotals: () => {
        const { workspaces, statuses } = get();
        return getTotals(buildWorkspaceRows(workspaces, statuses));
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