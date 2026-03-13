"use client";

import { useState } from "react";

export function IngestButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleIngest() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();

      if (data.success) {
        const stats = (data.result || Object.values(data.results)[0]) as {
          fetched: number;
          new: number;
          relevant: number;
          alerts: number;
        };
        setResult(
          `Fetched ${stats.fetched}, ${stats.new} new, ${stats.relevant} relevant, ${stats.alerts} alerts`
        );
        // Reload the page after a brief delay to show new alerts
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResult("Ingestion failed");
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
        onClick={handleIngest}
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Running..." : "Run Ingestion"}
      </button>
    </div>
  );
}
