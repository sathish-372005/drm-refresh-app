"use client";

import React from "react";
import Link from "next/link";
import { Folder, Pin } from "lucide-react";
import type { WorkspaceRow } from "@/app/lib/powerbi-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthBar } from "./HealthBar";
import Image from "next/image";

type Props = {
  row: WorkspaceRow;
  isPinned?: boolean;
  onTogglePin?: (id: string) => void;
};

export const WorkspaceCard = ({ row, isPinned = false, onTogglePin }: Props) => {
  const { id, name, total, healthy, failed } = row;
  const href = `/workspace/${encodeURIComponent(id)}?name=${encodeURIComponent(name)}`;
  const hasDatasets = total > 0;

  return (
    <Card className="group rounded-2xl border-border bg-card p-4 shadow-sm transition hover:border-[#F2C811]/70 hover:shadow-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
            <Image src="/group.svg" alt="Workspace" width={24} height={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[#A16207] dark:group-hover:text-[#F2C811]">
                {name}
              </span>
              <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {total} {total === 1 ? "dataset" : "datasets"}
                </span>
              </span>
            </span>
          </Link>

          {onTogglePin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onTogglePin(id)}
              aria-pressed={isPinned}
              aria-label={isPinned ? `Unpin ${name}` : `Pin ${name}`}
              className="size-9 shrink-0 rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
            >
              <Pin
                className={`size-4.5 transition-transform ${
                  isPinned
                    ? "rotate-45 fill-[#F2C811] text-[#A16207] dark:text-[#F2C811]"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          )}
        </div>

        <Link href={href} className="block space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/70 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold leading-none text-card-foreground">{total}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-3 py-2.5">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Completed
              </p>
              <p className="mt-1 text-lg font-semibold leading-none text-emerald-700 dark:text-emerald-400">
                {hasDatasets ? healthy : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/10 px-3 py-2.5">
              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">Failed</p>
              <p className="mt-1 text-lg font-semibold leading-none text-rose-700 dark:text-rose-400">
                {hasDatasets ? failed : "—"}
              </p>
            </div>
          </div>

          {!hasDatasets && (
            <p className="text-[11px] text-muted-foreground">No datasets</p>
          )}
        </Link>
      </div>
    </Card>
  );
};
