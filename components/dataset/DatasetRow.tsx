import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StatusBadge from "@/components/dataset/StatusBadge";
import { formatRelativeTime } from "@/components/dataset/format-utils";
import type { WorkspaceDataset } from "@/app/lib/powerbi-types";

type Props = {
  dataset: WorkspaceDataset;
  workspaceId: string;
  workspaceName: string;
  status: string | null;
  endTime: string | null;
};

export const DatasetRow = ({ dataset, workspaceId, workspaceName, status, endTime }: Props) => (
  <Link
    href={`/dataset/${encodeURIComponent(dataset.id)}?workspaceId=${encodeURIComponent(workspaceId)}&workspaceName=${encodeURIComponent(workspaceName)}&name=${encodeURIComponent(dataset.name)}`}
    className="group block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-[#F2C811]/70 hover:shadow-md active:scale-[0.99]"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm font-semibold text-card-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition-colors">
        {dataset.name}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition-transform group-hover:translate-x-0.5" />
    </div>
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      {status ? <StatusBadge status={status} size="sm" /> : <span>No refresh data</span>}
      <span>
        {endTime ? formatRelativeTime(endTime) : ""}
        {!dataset.isRefreshable && " · Not refreshable"}
      </span>
    </div>
  </Link>
);

