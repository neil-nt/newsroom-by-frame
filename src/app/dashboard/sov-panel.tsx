"use client";

import { useState, useEffect } from "react";

interface BrandData {
  name: string;
  mentions: number;
  share: number;
  sentiment: { positive: number; neutral: number; negative: number };
  topSources: string[];
}

interface ShareOfVoiceData {
  clientName: string;
  period: string;
  totalMentions: number;
  brands: BrandData[];
  topTopics: { topic: string; count: number }[];
  generatedAt: string;
}

const PERIODS = [
  { label: "7d", days: "7" },
  { label: "30d", days: "30" },
  { label: "90d", days: "90" },
] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SovPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShareOfVoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>("30");
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  async function fetchData(period: string, refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/share-of-voice?clientId=${clientId}&period=${period}${refresh ? "&refresh=true" : ""}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.cachedAt) setCachedAt(json.cachedAt);
      } else {
        setError(json.error || "Failed to load share of voice data");
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(activePeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function handlePeriodChange(days: string) {
    setActivePeriod(days);
    fetchData(days);
  }

  const maxShare = data
    ? Math.max(...data.brands.map((b) => b.share), 1)
    : 100;

  const maxTopicCount = data?.topTopics?.length
    ? Math.max(...data.topTopics.map((t) => t.count), 1)
    : 1;

  return (
    <div className="rounded-lg border-t-4 border-cyan-500 bg-white p-6 shadow-sm dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Share of Voice
          </h2>
          <p className="text-xs text-zinc-500">
            Brand mention share across monitored media
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cachedAt && (
            <span className="text-xs text-zinc-400">
              Last refreshed: {timeAgo(cachedAt)}
            </span>
          )}
          <button
            onClick={() => fetchData(activePeriod, true)}
            disabled={loading}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {/* Period toggle pills */}
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => handlePeriodChange(p.days)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activePeriod === p.days
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <p className="animate-pulse text-sm text-zinc-500">
            Calculating share of voice...
          </p>
        </div>
      )}

      {/* Data */}
      {data && !loading && (
        <>
          {/* Total mentions */}
          <div className="mb-5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {data.totalMentions}
            </span>
            <span className="text-sm text-zinc-500">
              total mentions in {data.period}
            </span>
          </div>

          {/* Brand bars */}
          <div className="mb-6 space-y-3">
            {data.brands.map((brand, i) => {
              const isClient = brand.name === data.clientName;
              const barWidth = maxShare > 0 ? (brand.share / maxShare) * 100 : 0;

              return (
                <div key={brand.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isClient
                            ? "text-violet-700 dark:text-violet-400"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {brand.name}
                      </span>
                      {i === 0 && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Sentiment dots */}
                      <div className="flex items-center gap-2 text-[10px]">
                        {brand.sentiment.positive > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span className="text-zinc-500">
                              {brand.sentiment.positive}
                            </span>
                          </span>
                        )}
                        {brand.sentiment.neutral > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            <span className="text-zinc-500">
                              {brand.sentiment.neutral}
                            </span>
                          </span>
                        )}
                        {brand.sentiment.negative > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                            <span className="text-zinc-500">
                              {brand.sentiment.negative}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="w-10 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {brand.mentions}
                      </span>
                      <span className="w-10 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {brand.share}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isClient ? "bg-violet-500" : "bg-zinc-400 dark:bg-zinc-600"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {brand.topSources.length > 0 && (
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      {brand.topSources.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top Topics */}
          {data.topTopics.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Top Topics
              </h3>
              <div className="space-y-1.5">
                {data.topTopics.map((t) => {
                  const topicBarWidth =
                    maxTopicCount > 0
                      ? (t.count / maxTopicCount) * 100
                      : 0;
                  return (
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-xs text-zinc-700 dark:text-zinc-300">
                        {t.topic}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                          style={{ width: `${topicBarWidth}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[10px] text-zinc-500">
                        {t.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generated timestamp */}
          <p className="mt-4 text-[10px] text-zinc-400">
            Generated {new Date(data.generatedAt).toLocaleString()} ({timeAgo(data.generatedAt)})
          </p>
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Loading share of voice data...
        </p>
      )}
    </div>
  );
}
