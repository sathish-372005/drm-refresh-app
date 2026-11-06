"use client";

import { useEffect, useState } from "react";
import { fetchDatasetRefresh } from "@/app/lib/workspace-api";
import type { DatasetRefreshResponse } from "@/app/lib/powerbi-types";

type State = { data: DatasetRefreshResponse | null; loading: boolean; error: string | null };

export const useDatasetRefresh = (
  getToken: () => Promise<string | null>,
  groupId: string | undefined,
  ids: string[]
): State => {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });
  const key = ids.join(",");

  useEffect(() => {
    if (!groupId || ids.length === 0) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchDatasetRefresh(getToken, groupId, ids)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch(
        (e) =>
          !cancelled &&
          setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Could not load refresh status." })
      );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, groupId, key]);

  return state;
};

