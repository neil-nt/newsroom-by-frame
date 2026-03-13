"use client";

import { useState, useCallback } from "react";

export interface AlertFilters {
  search: string;
  type: string | null;
  urgency: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

const INITIAL_FILTERS: AlertFilters = {
  search: "",
  type: null,
  urgency: null,
  dateFrom: null,
  dateTo: null,
};

const TYPES = ["Breaking", "Trending", "Speaker"] as const;
const URGENCIES = ["Critical", "High", "Medium", "Low"] as const;

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  onFilterChange,
}: {
  onFilterChange: (filters: AlertFilters) => void;
}) {
  const [filters, setFilters] = useState<AlertFilters>(INITIAL_FILTERS);
  const [open, setOpen] = useState(false);

  const update = useCallback(
    (patch: Partial<AlertFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        onFilterChange(next);
        return next;
      });
    },
    [onFilterChange]
  );

  const hasActiveFilters =
    filters.search !== "" ||
    filters.type !== null ||
    filters.urgency !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  const activeCount = [
    filters.search,
    filters.type,
    filters.urgency,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const clearAll = () => {
    setFilters(INITIAL_FILTERS);
    onFilterChange(INITIAL_FILTERS);
  };

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      {/* Toggle header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-zinc-400"
          >
            <path d="M2 4h12M4 8h8M6 12h4" />
          </svg>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Filters
          </span>
          {hasActiveFilters && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-400">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5.5L7 9.5L11 5.5" />
        </svg>
      </button>

      {/* Collapsible filter content */}
      {open && (
    <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 pb-3 pt-3 dark:border-zinc-800">
      {/* Search */}
      <input
        type="text"
        placeholder="Search alerts…"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 sm:w-48"
      />

      {/* Divider */}
      <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

      {/* Type pills */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Type
        </span>
        <PillButton
          label="All"
          active={filters.type === null}
          onClick={() => update({ type: null })}
        />
        {TYPES.map((t) => (
          <PillButton
            key={t}
            label={t}
            active={filters.type === t.toLowerCase()}
            onClick={() =>
              update({
                type: filters.type === t.toLowerCase() ? null : t.toLowerCase(),
              })
            }
          />
        ))}
      </div>

      {/* Divider */}
      <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

      {/* Urgency pills */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Urgency
        </span>
        <PillButton
          label="All"
          active={filters.urgency === null}
          onClick={() => update({ urgency: null })}
        />
        {URGENCIES.map((u) => (
          <PillButton
            key={u}
            label={u}
            active={filters.urgency === u.toLowerCase()}
            onClick={() =>
              update({
                urgency:
                  filters.urgency === u.toLowerCase()
                    ? null
                    : u.toLowerCase(),
              })
            }
          />
        ))}
      </div>

      {/* Divider */}
      <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          From
        </span>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            update({ dateFrom: e.target.value || null })
          }
          className="h-8 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          To
        </span>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) =>
            update({ dateTo: e.target.value || null })
          }
          className="h-8 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
        >
          Clear filters
        </button>
      )}
    </div>
      )}
    </div>
  );
}
