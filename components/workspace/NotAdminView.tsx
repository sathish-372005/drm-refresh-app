"use client";

import Link from "next/link";
import { ShieldAlert, LogIn, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export const NotAdminView = ({ message, onRetry }: Props) => {
  return (
    <Card className="space-y-4 rounded-3xl border border-amber-200/80 bg-amber-50/60 p-6 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      {/* Icon Badge */}
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#F2C811]/25 text-[#A16207] shadow-sm dark:text-[#F2C811]">
        <ShieldAlert className="size-8 stroke-[2]" />
      </div>

      {/* Heading & Explanation */}
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          You are not an administrator
        </h2>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
          {message ||
            "This dashboard requires Power BI / Fabric Administrator permissions (Tenant.Read.All) to monitor workspaces and refresh schedules across the tenant."}
        </p>
      </div>

      {/* Action Guidance Card */}
      <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3.5 text-left text-xs text-muted-foreground shadow-sm">
        <p className="font-semibold text-card-foreground">What you can do:</p>
        <p>• Sign in with an account that has the Power BI / Fabric Administrator role.</p>
        <p>• Contact your Microsoft 365 or Power BI administrator to assign you the required role or consent.</p>
      </div>

      {/* Action Buttons using shadcn Button */}
      <div className="flex flex-col gap-2 pt-1">
        <Button
          asChild
          className="h-11 w-full rounded-xl bg-[#F2C811] text-sm font-bold text-[#18181B] shadow-sm hover:bg-[#e0b80f] active:scale-98"
        >
          <Link href="/login">
            <LogIn className="size-4 stroke-[2.5]" />
            <span>Sign in with Admin Account</span>
          </Link>
        </Button>

        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-9 w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
            <span>Check permissions again</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
