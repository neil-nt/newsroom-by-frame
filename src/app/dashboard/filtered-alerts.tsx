"use client";

import { useState, useMemo, useCallback } from "react";
import { AlertCard } from "./alert-card";
import { FilterBar, type AlertFilters } from "./filter-bar";

interface AlertData {
  id: string;
  type: string;
  urgency: string;
  title: string;
  summary: string;
  whyItMatters: string;
  draftResponse: string | null;
  spokesperson: string | null;
  sourceUrl: string | null;
  confidence: number | null;
  category: string | null;
  targetMedia: string | null;
  dataPoints: string | null;
  status: string;
  outcome: string | null;
  outcomeNote: string | null;
  outcomeDate: Date | null;
  coverageUrl: string | null;
  createdAt: Date;
}

const PRIMARY_TYPES: Record<string, { label: string; description: string; color: string }> = {
  breaking: {
    label: "Breaking News",
    description: "Reactive opportunities requiring immediate attention",
    color: "border-red-500",
  },
  trending: {
    label: "Trending Topics",
    description: "Active trends where the client can add value",
    color: "border-amber-500",
  },
};

const SECONDARY_TYPES: Record<string, { label: string; description: string; color: string }> = {
  speaker: {
    label: "Speaker Pipeline",
    description: "Events and speaking opportunities",
    color: "border-emerald-500",
  },
};

const ALL_TYPES = { ...PRIMARY_TYPES, ...SECONDARY_TYPES };

export function FilteredAlerts({ initialAlerts, clientId }: { initialAlerts: AlertData[]; clientId: string }) {
  const [filters, setFilters] = useState<AlertFilters>({
    search: "",
    type: null,
    urgency: null,
    dateFrom: null,
    dateTo: null,
  });

  const filteredAlerts = useMemo(() => {
    return initialAlerts.filter((alert) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!alert.title.toLowerCase().includes(q) && !alert.summary.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.type && alert.type !== filters.type) return false;
      if (filters.urgency && alert.urgency !== filters.urgency) return false;
      if (filters.dateFrom && new Date(alert.createdAt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(alert.createdAt) > new Date(filters.dateTo + "T23:59:59.999Z")) return false;
      return true;
    });
  }, [initialAlerts, filters]);

  // Group by type
  const grouped: Record<string, AlertData[]> = {};
  for (const alert of filteredAlerts) {
    if (!grouped[alert.type]) grouped[alert.type] = [];
    grouped[alert.type].push(alert);
  }

  // If a specific type is filtered, only show that type panel
  const primaryToShow = filters.type
    ? (PRIMARY_TYPES[filters.type] ? { [filters.type]: PRIMARY_TYPES[filters.type] } : {})
    : PRIMARY_TYPES;

  const secondaryToShow = filters.type
    ? (SECONDARY_TYPES[filters.type] ? { [filters.type]: SECONDARY_TYPES[filters.type] } : {})
    : SECONDARY_TYPES;

  const COLLAPSED_COUNT = 3;

  function AlertPanel({ type, config }: { type: string; config: { label: string; description: string; color: string } }) {
    const [expanded, setExpanded] = useState(false);
    const typeAlerts = grouped[type] || [];
    const visibleAlerts = expanded ? typeAlerts : typeAlerts.slice(0, COLLAPSED_COUNT);
    const hasMore = typeAlerts.length > COLLAPSED_COUNT;

    return (
      <div
        className={`rounded-lg border-t-4 ${config.color} bg-white p-6 shadow-sm dark:bg-zinc-900`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {config.label}
            </h2>
            <p className="text-xs text-zinc-500">{config.description}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {typeAlerts.length}
          </span>
        </div>

        {typeAlerts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No alerts match the current filters.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} clientId={clientId} />
            ))}
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full rounded-md border border-zinc-200 py-2 text-center text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
              >
                {expanded
                  ? "Show less"
                  : `Show ${typeAlerts.length - COLLAPSED_COUNT} more`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <FilterBar onFilterChange={setFilters} />

      {/* Primary alerts: Breaking + Trending */}
      {Object.keys(primaryToShow).length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Object.entries(primaryToShow).map(([type, config]) => (
            <AlertPanel key={type} type={type} config={config} />
          ))}
        </div>
      )}

      {/* Speaker Pipeline rendered only when explicitly filtered to it */}
      {filters.type && Object.keys(secondaryToShow).length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Object.entries(secondaryToShow).map(([type, config]) => (
            <AlertPanel key={type} type={type} config={config} />
          ))}
        </div>
      )}
    </>
  );
}
