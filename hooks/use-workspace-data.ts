"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchStatuses, fetchWorkspaces } from "@/app/lib/workspace-api";
import type { StatusMap, Workspace } from "@/app/lib/powerbi-types";

type State = {
  workspaces: Workspace[];
  statuses: StatusMap;
  loading: boolean;
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
    error: null,
    errorCode: null,
    statusMissing: false,
  });

  const load = useCallback(
    async (force = false) => {
      setState((prev) => ({ ...prev, loading: true, error: null, errorCode: null }));
      // a failed status call never blocks the workspace list
      const [workspaces, statuses] = await Promise.allSettled([
        fetchWorkspaces(getToken, force),
        fetchStatuses(getToken, force),
      ]);

      const isWsRejected = workspaces.status === "rejected";
      const wsReason = isWsRejected ? workspaces.reason : null;
      const errorMsg = isWsRejected ? messageOf(wsReason) : null;
      const lower = (errorMsg || "").toLowerCase();
      const errorCode =
        (wsReason as any)?.code ||
        (lower.includes("not an admin") ||
        lower.includes("administrator") ||
        lower.includes("not_admin")
          ? "not_admin"
          : null);

      setState({
        workspaces: workspaces.status === "fulfilled" ? workspaces.value : [],
        statuses: statuses.status === "fulfilled" ? statuses.value : {},
        loading: false,
        error: errorMsg,
        errorCode,
        statusMissing: statuses.status === "rejected",
      });
    },
    [getToken]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: () => load(true) };
};
