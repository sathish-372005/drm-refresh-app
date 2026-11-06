import Link from "next/link";
import { ChevronRight, Folder, Pin } from "lucide-react";
import type { WorkspaceRow } from "@/app/lib/powerbi-types";
import { HealthBar } from "./HealthBar";

type Props = {
  row: WorkspaceRow;
  isPinned?: boolean;
  onTogglePin?: (id: string) => void;
};

export const WorkspaceCard = ({ row, isPinned = false, onTogglePin }: Props) => {
  const { id, name, total, healthy, refreshing, failed, nodata } = row;
  const statusKnown = total > 0 && nodata < total;

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-[#F2C811]/70 hover:shadow-md">
      <Link
        href={`/workspace/${encodeURIComponent(id)}?name=${encodeURIComponent(name)}`}
        className="block min-w-0 flex-1 space-y-3 pr-2"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F2C811]/20 text-[#A16207] dark:text-[#F2C811]">
            <Folder className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-card-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition-colors">
              {name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {total} {total === 1 ? "dataset" : "datasets"}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-[#A16207] dark:group-hover:text-[#F2C811] transition-transform group-hover:translate-x-0.5" />
        </div>

        {statusKnown ? (
          <div className="space-y-1.5">
            <HealthBar counts={{ healthy, refreshing, failed }} total={total} />
            <p className="text-xs text-muted-foreground">
              {healthy} ok
              {refreshing > 0 && <> · {refreshing} refreshing</>}
              {failed > 0 && (
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  {" "}
                  · ✕ {failed} failed of {total}
                </span>
              )}
            </p>
          </div>
        ) : (
          total > 0 && <p className="text-xs text-muted-foreground">Refresh status unavailable</p>
        )}
      </Link>

      {onTogglePin && (
        <button
          type="button"
          onClick={() => onTogglePin(id)}
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${name}` : `Pin ${name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition"
        >
          <Pin
            className={`size-4.5 transition-transform ${
              isPinned
                ? "fill-[#F2C811] text-[#A16207] dark:text-[#F2C811] rotate-45"
                : "text-muted-foreground"
            }`}
          />
        </button>
      )}
    </div>
  );
};

