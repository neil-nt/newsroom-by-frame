"use client";

import { useState } from "react";

export function BackfillButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleBackfill() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();

      if (data.success) {
        const stats = data.stats as {
          fetched: number;
          stored: number;
          brands: number;
        };
        setResult(
          `Fetched ${stats.fetched} articles, stored ${stats.stored} across ${stats.brands} brands`
        );
        setDone(true);
      } else {
        setResult(data.error || "Backfill failed");
      }
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-zinc-500">{result}</span>
      )}
      <button
        onClick={handleBackfill}
        disabled={loading || done}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {loading
          ? "Pulling historical data..."
          : done
            ? "Backfill Complete"
            : "Backfill 30 Days"}
      </button>
    </div>
  );
}
