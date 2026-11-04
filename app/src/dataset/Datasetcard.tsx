"use client";

import { useState } from "react";
import { Database, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";

export type Dataset = {
  id: string;
  name: string;
  configuredBy?: string | null;
  isRefreshable?: boolean;
  createdDate?: string;
};

type Props = {
  workspaceName: string;
  dataset: Dataset;
  onRefresh: () => Promise<void>;
  onViewLog: () => void;
};

type RefreshState = "idle" | "loading" | "queued" | "error";

export default function DatasetCard({
  workspaceName,
  dataset,
  onRefresh,
  onViewLog,
}: Props) {
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const refreshable = dataset.isRefreshable !== false;

  async function handleRefresh() {
    setRefreshState("loading");
    try {
      await onRefresh();
      setRefreshState("queued");
    } catch {
      setRefreshState("error");
    }
  }

  const created = dataset.createdDate
    ? new Date(dataset.createdDate).toLocaleDateString()
    : null;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-4",
        "shadow-sm transition-shadow hover:shadow-md"
      )}
    >
      {/* Accent stripe */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          refreshable ? "bg-yellow-400" : "bg-muted-foreground/30"
        )}
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
            <Database className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{dataset.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{workspaceName}</p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            refreshable
              ? "bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground"
          )}
        >
          {refreshable ? "Refreshable" : "Not refreshable"}
        </span>
      </div>

      {created && (
        <p className="mt-3 pl-2 text-xs text-muted-foreground">Created {created}</p>
      )}

      <div className="mt-4 flex gap-2 pl-2">
        <Button
          onClick={handleRefresh}
          disabled={!refreshable || refreshState === "loading"}
          className="h-10 flex-1 rounded-xl bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
        >
          {refreshState === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={onViewLog}
          className="h-10 flex-1 rounded-xl font-semibold"
        >
          <FileText className="size-4" />
          View log
        </Button>
      </div>

      {refreshState === "queued" && (
        <p role="status" className="mt-2 pl-2 text-xs text-emerald-700">
          Refresh started.
        </p>
      )}
      {refreshState === "error" && (
        <p role="alert" className="mt-2 pl-2 text-xs text-destructive">
          Couldn't start the refresh. Try again.
        </p>
      )}
    </article>
  );
}