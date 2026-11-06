import React from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      <Badge
        variant="destructive"
        className={`inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fee2e2] font-semibold text-[#dc2626] dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300 ${sizeClasses} ${className}`}
      >
        <X className="size-3 stroke-[2.5]" />
        <span>Failed</span>
      </Badge>
    );
  }

  if (isRefreshing) {
    return (
      <Badge
        className={`inline-flex items-center gap-1 rounded-md border border-[#fef08a] bg-[#fef9c3] font-semibold text-[#a16207] dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 ${sizeClasses} ${className}`}
      >
        <Loader2 className="size-3 animate-spin stroke-[2.5]" />
        <span>Refreshing</span>
      </Badge>
    );
  }

  if (isCompleted) {
    return (
      <Badge
        className={`inline-flex items-center gap-1 rounded-md border border-[#d1fae5] bg-[#ecfdf5] font-semibold text-[#16a34a] dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 ${sizeClasses} ${className}`}
      >
        <Check className="size-3 stroke-[3]" />
        <span>Completed</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-muted font-medium text-muted-foreground ${sizeClasses} ${className}`}
    >
      <span>{status || "Unknown"}</span>
    </Badge>
  );
}
