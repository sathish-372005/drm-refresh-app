import React from "react";
import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatNextSchedule, formatRelativeTime } from "./format-utils";
import { DatasetItem } from "./types";

type Props = {
  dataset: DatasetItem;
  workspaceId: string;
  workspaceName: string;
};

export default function DatasetCard({ dataset, workspaceId, workspaceName }: Props) {
  const query = new URLSearchParams();
  query.set("workspaceId", workspaceId);
  query.set("workspaceName", workspaceName);
  query.set("name", dataset.name);

  const href = `/dataset/${encodeURIComponent(dataset.id)}?${query.toString()}`;

  const status = dataset.lastRefresh?.status || "Completed";
  const isRefreshing = status.toLowerCase() === "refreshing" || status.toLowerCase() === "inprogress";
  const relativeTime = formatRelativeTime(
    dataset.lastRefresh?.startTime || dataset.lastRefresh?.endTime,
    isRefreshing ? "started " : ""
  );
  const nextScheduleText = formatNextSchedule(dataset.schedule);

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-[#F2C811]/70 hover:shadow-md active:scale-[0.99]"
    >
      {/* Title & Chevron */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#A16207] transition truncate">
          {dataset.name}
        </h3>
        <ChevronRight className="size-4 shrink-0 text-slate-400 group-hover:text-[#A16207] transition group-hover:translate-x-0.5" />
      </div>

      {/* Workspace Subtitle */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Folder className="size-3.5 text-slate-400" />
        <span className="truncate">{workspaceName}</span>
      </div>

      {/* Bottom Row: Status Badge + Next Run */}
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="sm" />
          <span className="text-xs text-slate-500">{relativeTime}</span>
        </div>

        <span className="text-xs font-medium text-slate-600 shrink-0">
          {nextScheduleText}
        </span>
      </div>
    </Link>
  );
}
