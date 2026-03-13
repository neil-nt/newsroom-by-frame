"use client";

import { useState } from "react";

interface SourceInfo {
  name: string;
  type: string;
  lastFetchedAt: Date | null;
}

export function SourceStatus({ sources }: { sources: SourceInfo[] }) {
  const [open, setOpen] = useState(false);
  const activeCount = sources.filter((s) => s.lastFetchedAt).length;

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Source Status
          </h2>
          <span className="text-xs text-zinc-400">
            {activeCount}/{sources.length} active
          </span>
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

      {open && (
        <div className="border-t border-zinc-100 px-6 pb-6 pt-4 dark:border-zinc-800">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {source.name}
                  </p>
                  <p className="text-xs text-zinc-400">{source.type}</p>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${
                    source.lastFetchedAt ? "bg-green-500" : "bg-zinc-300"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
