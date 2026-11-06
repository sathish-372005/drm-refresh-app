import { Database } from "lucide-react";

export const ListSkeleton = ({ count = 4, height = "h-28" }: { count?: number; height?: string }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className={`${height} animate-pulse rounded-2xl border border-border bg-card`} />
    ))}
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40">
    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="text-xs font-bold text-[#A16207] hover:underline dark:text-[#F2C811]">
        Try again
      </button>
    )}
  </div>
);

export const EmptyBox = ({ title, text }: { title: string; text: string }) => (
  <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
    <Database className="mx-auto size-8 text-muted-foreground" />
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

