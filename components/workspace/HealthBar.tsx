import type { WorkspaceRow } from "@/app/lib/powerbi-types";

const SEGMENTS = [
  { key: "healthy", className: "bg-emerald-500" },
  { key: "refreshing", className: "bg-amber-400" },
  { key: "failed", className: "bg-rose-500" },
] as const;

type Props = { counts: Pick<WorkspaceRow, "healthy" | "refreshing" | "failed">; total: number };

export const HealthBar = ({ counts, total }: Props) => (
  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
    {SEGMENTS.map(({ key, className }) => (
      <div key={key} className={className} style={{ width: `${total ? (counts[key] / total) * 100 : 0}%` }} />
    ))}
  </div>
);

