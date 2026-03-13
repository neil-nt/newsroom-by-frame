"use client";

import { useState, useEffect, useCallback } from "react";

interface JobInfo {
  name: string;
  cronExpression: string;
  description: string;
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  running: boolean;
}

interface SchedulerData {
  initialized: boolean;
  jobs: JobInfo[];
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);

  if (absDiff < 60_000) {
    const secs = Math.round(absDiff / 1000);
    return diffMs > 0 ? `in ${secs}s` : `${secs}s ago`;
  }
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    return diffMs > 0 ? `in ${mins}m` : `${mins}m ago`;
  }
  const hrs = Math.round(absDiff / 3_600_000);
  return diffMs > 0 ? `in ${hrs}h` : `${hrs}h ago`;
}

export function SchedulerStatus() {
  const [data, setData] = useState<SchedulerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      const json = await res.json();
      setData(json);
    } catch {
      // silent fail — widget is informational
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleToggle() {
    if (!data) return;
    const action = data.initialized ? "stop" : "start";
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchStatus();
  }

  async function handleTrigger(job: string) {
    setTriggering(job);
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger", job }),
    });
    // Brief delay so the running state can be picked up
    setTimeout(() => void fetchStatus(), 1000);
    setTriggering(null);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  if (!data) return null;

  const ingestion = data.jobs.find((j) => j.name === "ingestion");
  const backfill = data.jobs.find((j) => j.name === "backfill");

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              data.initialized
                ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]"
                : "bg-zinc-400"
            }`}
          />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Scheduler {data.initialized ? "Active" : "Stopped"}
          </span>
        </div>

        <button
          onClick={handleToggle}
          className="rounded px-2 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          {data.initialized ? "Pause" : "Resume"}
        </button>
      </div>

      {/* Job rows */}
      {data.initialized && (
        <div className="mt-2 space-y-1.5">
          {ingestion && (
            <JobRow
              label="Ingestion"
              job={ingestion}
              triggering={triggering === "ingestion"}
              onTrigger={() => handleTrigger("ingestion")}
            />
          )}
          {backfill && (
            <JobRow
              label="Backfill"
              job={backfill}
              triggering={triggering === "backfill"}
              onTrigger={() => handleTrigger("backfill")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function JobRow({
  label,
  job,
  triggering,
  onTrigger,
}: {
  label: string;
  job: JobInfo;
  triggering: boolean;
  onTrigger: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-500">
      <div className="flex items-center gap-1.5">
        {job.running ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        ) : (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        )}
        <span className="font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
        {job.running ? (
          <span className="text-amber-600 dark:text-amber-400">running</span>
        ) : (
          <>
            <span className="text-zinc-400 dark:text-zinc-600">|</span>
            <span>last {formatRelative(job.lastRunAt)}</span>
            <span className="text-zinc-400 dark:text-zinc-600">|</span>
            <span>next {formatRelative(job.nextRunAt)}</span>
          </>
        )}
        {job.lastRunError && (
          <span className="text-red-500" title={job.lastRunError}>
            (error)
          </span>
        )}
      </div>
      <button
        onClick={onTrigger}
        disabled={job.running || triggering}
        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
      >
        {triggering ? "..." : "Run now"}
      </button>
    </div>
  );
}
