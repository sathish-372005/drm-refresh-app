import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Props = {
  failedCount: number;
  datasetName: string;
  timeAgo: string;
  datasetId: string;
  workspaceId?: string;
  workspaceName?: string;
};

export default function FailedAlertBanner({
  failedCount,
  datasetName,
  timeAgo,
  datasetId,
  workspaceId = "",
  workspaceName = "",
}: Props) {
  const query = new URLSearchParams();
  if (workspaceId) query.set("workspaceId", workspaceId);
  if (workspaceName) query.set("workspaceName", workspaceName);
  if (datasetName) query.set("name", datasetName);

  const href = `/dataset/${encodeURIComponent(datasetId)}?${query.toString()}`;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#fee2e2]/70 p-4 border border-[#fecaca] shadow-sm transition hover:bg-[#fee2e2]/85"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#fca5a5]/30 text-[#b91c1c]">
          <AlertTriangle className="size-4 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#991b1b]">
            {failedCount} refresh failed today
          </p>
          <p className="text-xs text-[#b91c1c]/90">
            {datasetName} · {timeAgo}
          </p>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-[#991b1b] underline underline-offset-2 hover:text-[#7f1d1d]"
      >
        View
      </Link>
    </div>
  );
}

