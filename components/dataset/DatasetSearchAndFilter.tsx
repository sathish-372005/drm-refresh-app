import React from "react";
import { Search } from "lucide-react";

export type FilterCategory = "All" | "Failed" | "Refreshing" | "Healthy";

type Props = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: FilterCategory;
  onFilterChange: (f: FilterCategory) => void;
};

const FILTERS: FilterCategory[] = ["All", "Failed", "Refreshing", "Healthy"];

export default function DatasetSearchAndFilter({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: Props) {
  return (
    <div className="space-y-3.5">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search datasets or workspaces"
          className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filter Pills with Power BI Yellow active state */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                isActive
                  ? "bg-[#F2C811] text-[#18181B] font-bold shadow-sm shadow-[#F2C811]/30 border border-[#E5B800]"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
