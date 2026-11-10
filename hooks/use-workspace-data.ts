"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePowerBiStore } from "@/store/use-powerbi-store";

export const useWorkspaceData = (getToken: () => Promise<string | null>) => {
  const workspaces = usePowerBiStore((s) => s.workspaces);
  const statuses = usePowerBiStore((s) => s.statuses);
  const loadingWorkspaces = usePowerBiStore((s) => s.loadingWorkspaces);
  const workspacesLoadedAt = usePowerBiStore((s) => s.workspacesLoadedAt);
  const backgroundUpdating = usePowerBiStore((s) => s.backgroundUpdating);
  const error = usePowerBiStore((s) => s.error);
  const errorCode = usePowerBiStore((s) => s.errorCode);
  const fetchWorkspaces = usePowerBiStore((s) => s.fetchWorkspaces);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const stableGetToken = useCallback(() => getTokenRef.current(), []);

  useEffect(() => {
    void fetchWorkspaces(stableGetToken);
  }, [fetchWorkspaces, stableGetToken]);

  // Skeleton until the first load finishes or fails (not while cached data exists)
  const loading = loadingWorkspaces || (workspacesLoadedAt === null && !error);

  const reload = useCallback(() => fetchWorkspaces(stableGetToken, true), [fetchWorkspaces, stableGetToken]);

  return {
    workspaces,
    statuses,
    loading,
    backgroundUpdating,
    statusesLoading: backgroundUpdating,
    error,
    errorCode,
    statusMissing: false,
    reload,
  };
};