import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/dataset/StatusBadge";
import { formatNextSchedule, formatRelativeTime } from "@/components/dataset/format-utils";
import type { RefreshSchedule, WorkspaceDataset } from "@/app/lib/powerbi-types";
import Image from "next/image";

type Props = {
  dataset: WorkspaceDataset;
  workspaceId: string;
  workspaceName: string;
  status: string | null;
  startTime?: string | null;
  endTime: string | null;
  schedule?: RefreshSchedule | null;
};

export const DatasetRow = ({
  dataset,
  workspaceId,
  workspaceName,
  status,
  startTime,
  endTime,
  schedule,
}: Props) => {
  const normStatus = status || "Completed";
  const isRefreshing =
    normStatus.toLowerCase() === "refreshing" ||
    normStatus.toLowerCase() === "inprogress";

  const relativeTime = formatRelativeTime(
    startTime || endTime || undefined,
    isRefreshing ? "started " : ""
  );
  const nextScheduleText = formatNextSchedule(schedule);

  const query = new URLSearchParams();
  query.set("workspaceId", workspaceId);
  query.set("workspaceName", workspaceName);
  query.set("name", dataset.name);

  const href = `/dataset/${encodeURIComponent(dataset.id)}?${query.toString()}`;

  return (
    <Card className="group rounded-2xl border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition hover:border-[#F2C811]/70 hover:shadow-md active:scale-[0.99]">
      <Link href={href} className="block">
        {/* Title & Chevron */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition truncate">
            {dataset.name}
          </h3>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition group-hover:translate-x-0.5" />
        </div>

        {/* Workspace Subtitle */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Image src="/group.svg" alt="Workspace" width={24} height={24} />
          <span className="truncate">{workspaceName}</span>
        </div>

        {/* Bottom Row: Status Badge + Next Run */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={normStatus} size="sm" />
            <span className="text-xs text-muted-foreground">{relativeTime}</span>
          </div>

          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
            {nextScheduleText}
          </span>
        </div>
      </Link>
    </Card>
  );
};
