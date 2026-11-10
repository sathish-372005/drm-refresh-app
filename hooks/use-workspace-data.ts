"use client";

import { useEffect } from "react";
import { usePowerBiStore } from "@/store/use-powerbi-store";

export const useWorkspaceData = (getToken: () => Promise<string | null>) => {
  const workspaces = usePowerBiStore((s) => s.workspaces);
  const statuses = usePowerBiStore((s) => s.statuses);
  const loading = usePowerBiStore((s) => s.loadingWorkspaces);
  const backgroundUpdating = usePowerBiStore((s) => s.backgroundUpdating);
  const error = usePowerBiStore((s) => s.error);
  const errorCode = usePowerBiStore((s) => s.errorCode);
  const fetchWorkspaces = usePowerBiStore((s) => s.fetchWorkspaces);

  useEffect(() => {
    void fetchWorkspaces(getToken);
  }, [fetchWorkspaces, getToken]);

  return {
    workspaces,
    statuses,
    loading,
    backgroundUpdating,
    statusesLoading: backgroundUpdating,
    error,
    errorCode,
    statusMissing: false,
    reload: () => fetchWorkspaces(getToken, true),
  };
};
