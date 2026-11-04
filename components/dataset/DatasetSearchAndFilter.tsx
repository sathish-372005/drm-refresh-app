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
        <Search className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search datasets or workspaces"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F2C811] focus:outline-none focus:ring-2 focus:ring-[#F2C811]/30 shadow-sm transition"
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
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
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
