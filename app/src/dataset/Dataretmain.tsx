"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DatasetCard, { Dataset } from "./Datasetcard";

type Workspace = {
  id: string;
  name: string;
  datasets: Dataset[];
};

type DatasetsResponse = {
  totalDatasets: number;
  workspaces: Workspace[];
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DatasetsResponse };

type Props = {
  getToken: () => Promise<string | null>;
};

const API_URL = "/api/powerbi/datasets";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDatasetsResponse(value: unknown): value is DatasetsResponse {
  return (
    isRecord(value) &&
    typeof value.totalDatasets === "number" &&
    Array.isArray(value.workspaces)
  );
}

export default function Dataretmain({ getToken }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState({ status: "loading" });
      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error("Sign in to load your datasets.");

        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            isRecord(body) && typeof body.error === "string"
              ? body.error
              : `Unable to load datasets (HTTP ${res.status}).`
          );
        }
        if (!isDatasetsResponse(body)) throw new Error("Invalid response from server.");

        setState({ status: "success", data: body });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Something went wrong.",
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [reloadKey]);

  async function refreshDataset(workspaceId: string, datasetId: string) {
    const token = await getTokenRef.current();
    if (!token) throw new Error("Not signed in");

    const res = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceId, datasetId }),
    });
    if (!res.ok) throw new Error("Refresh failed");
  }

  function viewLog(workspaceId: string, datasetId: string) {
    router.push(`/history?workspaceId=${workspaceId}&datasetId=${datasetId}`);
  }

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading datasets" className="grid gap-4 p-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="space-y-3 p-4">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  const { data } = state;

  if (data.totalDatasets === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No datasets configured by your account were found.
      </p>
    );
  }

  return (
    <section className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">
        My datasets <span className="text-muted-foreground">({data.totalDatasets})</span>
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.workspaces.flatMap((workspace) =>
          workspace.datasets.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              workspaceName={workspace.name}
              dataset={dataset}
              onRefresh={() => refreshDataset(workspace.id, dataset.id)}
              onViewLog={() => viewLog(workspace.id, dataset.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}