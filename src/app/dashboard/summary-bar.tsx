"use client";

import { useState, useEffect } from "react";

// ---------- Types ----------

interface TrendData {
  clientName: string;
  period: number;
  dailyMentions: { date: string; total: number }[];
}

interface SovBrand {
  name: string;
  mentions: number;
  share: number;
  sentiment: { positive: number; neutral: number; negative: number };
}

interface SovData {
  clientName: string;
  totalMentions: number;
  brands: SovBrand[];
}

interface CitationReport {
  overallVisibility: number;
}

// ---------- Skeleton ----------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-700 ${className}`}
    />
  );
}

// ---------- Stat Card ----------

function StatCard({
  label,
  children,
  loading,
}: {
  label: string;
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex-1 min-w-[140px] rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="mt-1">
        {loading ? <Skeleton className="h-6 w-20" /> : children}
      </div>
    </div>
  );
}

// ---------- Delta Arrow ----------

function DeltaArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;

  const pct =
    previous === 0
      ? current > 0
        ? 100
        : 0
      : Math.round(((current - previous) / previous) * 100);

  if (pct === 0) return null;

  const isUp = pct > 0;
  return (
    <span
      className={`ml-1.5 inline-flex items-center text-[11px] font-medium ${
        isUp
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400"
      }`}
    >
      <svg
        className={`h-3 w-3 ${isUp ? "" : "rotate-180"}`}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 2l4 5H2l4-5z" />
      </svg>
      {Math.abs(pct)}%
    </span>
  );
}

// ---------- Sentiment Mini Bar ----------

function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) {
    return <span className="text-xs text-zinc-400">No data</span>;
  }

  const pPos = Math.round((positive / total) * 100);
  const pNeu = Math.round((neutral / total) * 100);
  const pNeg = 100 - pPos - pNeu;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        {pPos > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${pPos}%` }}
          />
        )}
        {pNeu > 0 && (
          <div
            className="bg-zinc-400 transition-all duration-500"
            style={{ width: `${pNeu}%` }}
          />
        )}
        {pNeg > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${pNeg}%` }}
          />
        )}
      </div>
      <span className="text-[10px] text-zinc-400">
        {pPos}% pos
      </span>
    </div>
  );
}

// ---------- Main Component ----------

export function SummaryBar({
  clientName,
  clientId,
}: {
  clientName: string;
  clientId: string;
}) {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [prevTrendData, setPrevTrendData] = useState<TrendData | null>(null);
  const [sovData, setSovData] = useState<SovData | null>(null);
  const [citationData, setCitationData] = useState<CitationReport | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingSov, setLoadingSov] = useState(true);
  const [loadingCitations, setLoadingCitations] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch 7d trends (current period)
    async function fetchTrends() {
      try {
        const res = await fetch(
          `/api/trends?clientId=${clientId}&period=7`
        );
        const json = await res.json();
        if (!cancelled && json.success) setTrendData(json.data);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoadingTrends(false);
      }
    }

    // Fetch 14d trends to derive previous-7d comparison
    async function fetchPrevTrends() {
      try {
        const res = await fetch(
          `/api/trends?clientId=${clientId}&period=14`
        );
        const json = await res.json();
        if (!cancelled && json.success) setPrevTrendData(json.data);
      } catch {
        /* silent */
      }
    }

    // Fetch SOV
    async function fetchSov() {
      try {
        const res = await fetch(
          `/api/share-of-voice?clientId=${clientId}&period=7`
        );
        const json = await res.json();
        if (!cancelled && json.success) setSovData(json.data);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoadingSov(false);
      }
    }

    // Fetch citations
    async function fetchCitations() {
      try {
        const res = await fetch(`/api/citations?clientId=${clientId}`);
        const json = await res.json();
        if (!cancelled && json.success && json.report) {
          setCitationData(json.report);
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoadingCitations(false);
      }
    }

    // Fetch AI insight
    async function fetchInsight() {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            question: `Give a single-sentence summary (max 25 words) of the most notable trend or development for ${clientName} this week. Be specific — cite numbers, topics, or sources where possible. Speak in the third person about ${clientName}. Do not include any preamble — just the sentence.`,
          }),
        });
        const json = await res.json();
        if (!cancelled && json.success) setInsight(json.answer);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoadingInsight(false);
      }
    }

    fetchTrends();
    fetchPrevTrends();
    fetchSov();
    fetchCitations();
    fetchInsight();

    return () => {
      cancelled = true;
    };
  }, [clientId, clientName]);

  // Derived values
  const currentMentions =
    trendData?.dailyMentions.reduce((sum, d) => sum + d.total, 0) ?? 0;

  // Previous 7d = first 7 days from 14d data (the older half)
  const previousMentions = (() => {
    if (!prevTrendData) return 0;
    const days = prevTrendData.dailyMentions;
    if (days.length <= 7) return 0;
    return days.slice(0, days.length - 7).reduce((sum, d) => sum + d.total, 0);
  })();

  // Client SOV share
  const clientBrand = sovData?.brands.find(
    (b) => b.name.toLowerCase() === clientName.toLowerCase()
  );
  const clientShare = clientBrand?.share ?? 0;

  // Aggregate sentiment from client brand in SOV
  const sentiment = clientBrand?.sentiment ?? { positive: 0, neutral: 0, negative: 0 };

  // AI visibility
  const aiVisibility = citationData?.overallVisibility ?? null;

  return (
    <div className="space-y-2">
      {/* Stat cards row */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Mentions (7d)" loading={loadingTrends}>
          <div className="flex items-baseline">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {currentMentions}
            </span>
            {prevTrendData && (
              <DeltaArrow current={currentMentions} previous={previousMentions} />
            )}
          </div>
        </StatCard>

        <StatCard label="Share of Voice" loading={loadingSov}>
          <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
            {clientShare}%
          </span>
        </StatCard>

        <StatCard label="Sentiment" loading={loadingSov}>
          <SentimentBar
            positive={sentiment.positive}
            neutral={sentiment.neutral}
            negative={sentiment.negative}
          />
        </StatCard>

        <StatCard label="AI Visibility" loading={loadingCitations}>
          {aiVisibility !== null ? (
            <span
              className={`text-xl font-bold ${
                aiVisibility >= 70
                  ? "text-emerald-600 dark:text-emerald-400"
                  : aiVisibility >= 40
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {aiVisibility}%
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Not yet analysed</span>
          )}
        </StatCard>
      </div>

      {/* AI insight line */}
      <div className="px-1">
        {loadingInsight ? (
          <Skeleton className="h-4 w-3/4" />
        ) : insight ? (
          <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-violet-500" />
            {insight}
          </p>
        ) : null}
      </div>
    </div>
  );
}
