import React from "react";
import { Check, X, Clock, Loader2 } from "lucide-react";

type Props = {
  status?: string | null;
  className?: string;
  size?: "sm" | "md";
};

export default function StatusBadge({ status, className = "", size = "md" }: Props) {
  const norm = (status || "Completed").toLowerCase();

  const isFailed = norm === "failed" || norm === "disabled";
  const isRefreshing = norm === "refreshing" || norm === "inprogress";
  const isCompleted = norm === "completed" || norm === "healthy" || norm === "success";

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (isFailed) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-md bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] ${sizeClasses} ${className}`}
      >
        <X className="size-3 stroke-[2.5]" />
        <span>Failed</span>
      </span>
    );
  }

  if (isRefreshing) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-md bg-[#fef9c3] text-[#a16207] border border-[#fef08a] ${sizeClasses} ${className}`}
      >
        <Loader2 className="size-3 animate-spin stroke-[2.5]" />
        <span>Refreshing</span>
      </span>
    );
  }

  if (isCompleted) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-md bg-[#ecfdf5] text-[#16a34a] border border-[#d1fae5] ${sizeClasses} ${className}`}
      >
        <Check className="size-3 stroke-[3]" />
        <span>Completed</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
    >
      <Clock className="size-3 stroke-[2]" />
      <span className="capitalize">{status || "Unknown"}</span>
    </span>
  );
}

