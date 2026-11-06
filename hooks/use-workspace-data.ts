"use client";

import { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import { fetchDatasetRefresh, fetchStatuses, fetchWorkspaces } from "@/app/lib/workspace-api";
import type { StatusMap, Workspace } from "@/app/lib/powerbi-types";

type State = {
  workspaces: Workspace[];
  statuses: StatusMap;
  loading: boolean;
  statusesLoading: boolean;
  error: string | null;
  errorCode: string | null;
  statusMissing: boolean;
};

const messageOf = (reason: unknown) =>
  reason instanceof Error ? reason.message : "Something went wrong.";

export const useWorkspaceData = (getToken: () => Promise<string | null>) => {
  const [state, setState] = useState<State>({
    workspaces: [],
    statuses: {},
    loading: true,
    statusesLoading: true,
    error: null,
    errorCode: null,
    statusMissing: false,
  });

  const load = useCallback(
    async (force = false) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        statusesLoading: true,
        error: null,
        errorCode: null,
      }));

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

      const workspaces = workspacesResult.status === "fulfilled" ? workspacesResult.value : [];
      const initStatuses: StatusMap =
        statusesResult.status === "fulfilled" ? statusesResult.value : {};

      setState({
        workspaces,
        statuses: initStatuses,
        loading: false,
        statusesLoading: workspaces.length > 0,
        error: errorMsg,
        errorCode,
        statusMissing: false,
      });

      // Background resolution for all workspaces with datasets
      const workspacesWithDatasets = workspaces.filter(
        (w) => w.datasets && w.datasets.length > 0
      );

      if (workspacesWithDatasets.length > 0) {
        const batches = _.chunk(workspacesWithDatasets, 4);

        void batches
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
                let isRateLimited = false;

                results.forEach((res) => {
                  if (res.status === "fulfilled" && res.value) {
                    if (res.value.rateLimited) isRateLimited = true;
                    Object.entries(res.value.statuses).forEach(([id, st]) => {
                      if (st && st.error === null && st.status !== null) {
                        batchStatuses[id] = st;
                      }
                    });
                  }
                });

                if (!_.isEmpty(batchStatuses)) {
                  setState((prev) => ({
                    ...prev,
                    statuses: { ...prev.statuses, ...batchStatuses },
                  }));
                }

                if (isRateLimited) {
                  throw new Error("rate_limited");
                }
              }),
            Promise.resolve()
          )
          .catch(() => {
            // Silently stop background resolution if rate limited
          })
          .finally(() => {
            setState((prev) => ({ ...prev, statusesLoading: false }));
          });
      } else {
        setState((prev) => ({ ...prev, statusesLoading: false }));
      }
    },
    [getToken]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: () => load(true) };
};
