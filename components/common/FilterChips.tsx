type Props<T extends string> = { options: readonly T[]; value: T; onChange: (value: T) => void };

export const FilterChips = <T extends string>({ options, value, onChange }: Props<T>) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
    {options.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-sm ${
            active
              ? "bg-[#F2C811] text-[#18181B] font-bold shadow-sm shadow-[#F2C811]/30 border border-[#E5B800]"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          {option}
        </button>
      );
    })}
  </div>
);

