"use client";

import React from "react";
import StatusBadge from "./StatusBadge";
import ErrorAccordion from "./ErrorAccordion";
import { formatRunDateTime } from "./format-utils";
import { RefreshRun } from "./types";

type Props = {
  run: RefreshRun;
};

export default function RefreshHistoryRow({ run }: Props) {
  const triggerLabel = run.refreshType === "ViaApi" ? "On demand" : "Scheduled";
  const dateFormatted = formatRunDateTime(run.startTime || run.endTime);
  const isFailed =
    run.status?.toLowerCase() === "failed" ||
    run.status?.toLowerCase() === "disabled";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-2 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">
          {dateFormatted}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
          {triggerLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={run.status} size="sm" />
        <span className="text-xs text-slate-500 font-medium">
          {run.durationText || "—"}
        </span>
      </div>

      {/* Accordion ONLY for failed runs */}
      {isFailed && run.errorMessage && (
        <div className="pt-1">
          <ErrorAccordion error={run.errorMessage} />
        </div>
      )}
    </div>
  );
}
