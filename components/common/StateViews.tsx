import { Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const ListSkeleton = ({ count = 4, height = "h-20" }: { count?: number; height?: string }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} className={`${height} w-full rounded-2xl border border-border`} />
    ))}
  </div>
);

export const WorkspaceListSkeleton = () => (
  <div role="status" aria-label="Loading workspaces" className="space-y-3">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    ))}
  </div>
);

export const FilterChipsSkeleton = () => (
  <div role="status" aria-label="Loading refresh counts" className="flex justify-center gap-3">
    {Array.from({ length: 3 }, (_, i) => (
      <Skeleton key={i} className="h-[68px] min-w-[104px] flex-1 rounded-xl" />
    ))}
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Alert
    variant="destructive"
    className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40"
  >
    <AlertDescription className="text-sm font-semibold text-rose-800 dark:text-rose-300">
      {message}
    </AlertDescription>
    {onRetry && (
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onRetry}
        className="text-xs font-bold text-[#A16207] hover:underline dark:text-[#F2C811]"
      >
        Try again
      </Button>
    )}
  </Alert>
);

export const EmptyBox = ({ title, text }: { title: string; text: string }) => (
  <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
    <Database className="mx-auto size-8 text-muted-foreground" />
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);
