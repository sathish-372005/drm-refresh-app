export type ChipTone = "gray" | "blue" | "amber" | "green" | "purple" | "orange" | "red";

const TONES: Record<ChipTone, { idle: string; active: string; dot: string; label: string }> = {
  gray:   { idle: "bg-card border-border",                   active: "bg-slate-500/10 border-slate-400 ring-1 ring-slate-400/40",         dot: "bg-slate-400",   label: "text-slate-600 dark:text-slate-300" },
  blue:   { idle: "bg-card border-border",                   active: "bg-blue-500/10 border-blue-400 ring-1 ring-blue-400/40",            dot: "bg-blue-500",    label: "text-blue-600 dark:text-blue-400" },
  amber:  { idle: "bg-amber-500/10 border-amber-500/20",     active: "bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40",         dot: "bg-amber-500",   label: "text-amber-700 dark:text-amber-400" },
  green:  { idle: "bg-emerald-500/10 border-emerald-500/20", active: "bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40",   dot: "bg-emerald-500", label: "text-emerald-700 dark:text-emerald-400" },
  purple: { idle: "bg-card border-border",                   active: "bg-violet-500/10 border-violet-400 ring-1 ring-violet-400/40",      dot: "bg-violet-500",  label: "text-violet-600 dark:text-violet-400" },
  orange: { idle: "bg-orange-500/10 border-orange-500/20",   active: "bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40",      dot: "bg-orange-500",  label: "text-orange-700 dark:text-orange-400" },
  red:    { idle: "bg-rose-500/10 border-rose-500/20",       active: "bg-rose-500/15 border-rose-500 ring-1 ring-rose-500/40",            dot: "bg-rose-500",    label: "text-rose-700 dark:text-rose-400" },
};

type Props<T extends string> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  counts?: Partial<Record<T, number>>;
  tones?: Partial<Record<T, ChipTone>>;
};

export const FilterChips = <T extends string>({
  options,
  value,
  onChange,
  counts,
  tones,
}: Props<T>) => (
  <div className="flex items-stretch justify-center gap-3 overflow-x-auto pb-1 no-scrollbar">
    {options.map((option) => {
      const active = option === value;
      const tone = TONES[tones?.[option] ?? "gray"];
      const count = counts?.[option];

      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(active ? null : option)}
          aria-pressed={active}
          className={`min-w-[104px] shrink-0 rounded-xl border px-4 py-3 text-left shadow-sm transition active:scale-[0.97] ${
            active ? tone.active : `${tone.idle} hover:border-foreground/20`
          }`}
        >
          <p className="text-2xl font-bold leading-none text-foreground tabular-nums">
            {count ?? "–"}
          </p>
          <p
            className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
              active ? tone.label : "text-muted-foreground"
            }`}
          >
            <span className={`size-1.5 rounded-full ${tone.dot}`} />
            {option}
          </p>
        </button>
      );
    })}
  </div>
);