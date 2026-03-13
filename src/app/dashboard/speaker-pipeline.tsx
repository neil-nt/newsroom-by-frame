"use client";

import { useState } from "react";
import { AlertCard } from "./alert-card";

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

export function SpeakerPipeline({
  alerts,
  clientId,
}: {
  alerts: AlertData[];
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const speakerAlerts = alerts.filter((a) => a.type === "speaker");

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-1 w-6 rounded-full bg-emerald-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Speaker Pipeline
          </h2>
          <span className="text-xs text-zinc-400">
            Events and speaking opportunities
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {speakerAlerts.length}
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
          {speakerAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              No speaker opportunities yet. Run ingestion to detect events.
            </p>
          ) : (
            <div className="space-y-3">
              {speakerAlerts.slice(0, 10).map((alert) => (
                <AlertCard key={alert.id} alert={alert} clientId={clientId} />
              ))}
              {speakerAlerts.length > 10 && (
                <p className="text-center text-xs text-zinc-400">
                  + {speakerAlerts.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
