"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BrandCitation {
  query: string;
  category: string;
  brandMentioned: boolean;
  mentionContext: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  position: number | null;
  competitorsMentioned: string[];
  claudeMentioned: boolean;
  perplexityMentioned: boolean;
  perplexityContext: string | null;
  claudeContext: string | null;
  claudeSentiment: "positive" | "neutral" | "negative" | null;
  perplexitySentiment: "positive" | "neutral" | "negative" | null;
  sourceUrls: string[];
  previousBrandMentioned?: boolean | null;
  trend?: "up" | "down" | "same" | "new" | null;
  isCustom?: boolean;
}

interface CitationReport {
  clientName: string;
  overallVisibility: number;
  claudeVisibility: number;
  perplexityVisibility: number;
  citations: BrandCitation[];
  competitorComparison: {
    name: string;
    visibility: number;
    claudeVisibility: number;
    perplexityVisibility: number;
  }[];
  recommendations: string[];
  generatedAt: string;
  previousCitations?: { query: string; brandMentioned: boolean }[];
}

type ViewMode = "combined" | "side-by-side";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SENTIMENT_BADGES: Record<string, { label: string; color: string }> = {
  positive: {
    label: "Positive",
    color:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
  neutral: {
    label: "Neutral",
    color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  negative: {
    label: "Negative",
    color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
};

const TREND_ICONS: Record<string, { label: string; icon: string; color: string }> = {
  up: { label: "Improved since last run", icon: "\u2191", color: "text-emerald-500" },
  down: { label: "Declined since last run", icon: "\u2193", color: "text-red-500" },
  same: { label: "No change since last run", icon: "\u2013", color: "text-zinc-400" },
  new: { label: "First time queried", icon: "\u2022", color: "text-indigo-400" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function visibilityColor(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

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

function barColor(isClient: boolean): string {
  return isClient ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600";
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function citationsToCsv(citations: BrandCitation[], clientName: string): string {
  const header =
    "Query,Category,Brand Mentioned,Sentiment,Position,Competitors,Claude Mentioned,Perplexity Mentioned,Trend,Sources";
  const rows = citations.map((c) => {
    const fields = [
      `"${c.query.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      c.brandMentioned ? "Yes" : "No",
      c.sentiment || "",
      c.position != null ? String(c.position) : "",
      `"${c.competitorsMentioned.join("; ")}"`,
      c.claudeMentioned ? "Yes" : "No",
      c.perplexityMentioned ? "Yes" : "No",
      c.trend || "",
      `"${c.sourceUrls.join("; ")}"`,
    ];
    return fields.join(",");
  });
  return `Citation Report for ${clientName}\n${header}\n${rows.join("\n")}`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ModelBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
      }`}
      title={`${label === "C" ? "Claude" : "Perplexity"}: ${active ? "Mentioned" : "Not mentioned"}`}
    >
      {label}
    </span>
  );
}

function TrendIndicator({ trend }: { trend?: string | null }) {
  if (!trend || !TREND_ICONS[trend]) return null;
  const t = TREND_ICONS[trend];
  return (
    <span className={`inline-flex items-center text-xs font-bold ${t.color}`} title={t.label}>
      {t.icon}
    </span>
  );
}

function SourceLinks({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {urls.slice(0, 5).map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-400 dark:hover:bg-sky-900"
          title={url}
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          {domainFromUrl(url)}
        </a>
      ))}
      {urls.length > 5 && (
        <span className="text-[10px] text-zinc-400">+{urls.length - 5} more</span>
      )}
    </div>
  );
}

/** Single citation card — combined view */
function CitationCardCombined({
  citation,
  onCompetitorClick,
}: {
  citation: BrandCitation;
  onCompetitorClick: (name: string) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">
          {citation.brandMentioned ? (
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {citation.query}
            </p>
            <div className="flex flex-shrink-0 items-center gap-1">
              <TrendIndicator trend={citation.trend} />
              <ModelBadge label="C" active={citation.claudeMentioned} />
              <ModelBadge label="P" active={citation.perplexityMentioned} />
            </div>
          </div>
          {citation.isCustom && (
            <span className="mt-0.5 inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              Custom query
            </span>
          )}
          {citation.brandMentioned && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {citation.position != null && (
                <span className="inline-flex rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  #{citation.position} mentioned
                </span>
              )}
              {citation.sentiment && SENTIMENT_BADGES[citation.sentiment] && (
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${SENTIMENT_BADGES[citation.sentiment].color}`}
                >
                  {SENTIMENT_BADGES[citation.sentiment].label}
                </span>
              )}
            </div>
          )}
          {citation.mentionContext && (
            <p className="mt-1.5 text-[11px] italic text-zinc-400 line-clamp-2">
              &ldquo;{citation.mentionContext}&rdquo;
            </p>
          )}
          {citation.competitorsMentioned.length > 0 && (
            <p className="mt-1 text-[10px] text-zinc-400">
              Also mentioned:{" "}
              {citation.competitorsMentioned.map((comp, ci) => (
                <span key={comp}>
                  {ci > 0 && ", "}
                  <button
                    onClick={() => onCompetitorClick(comp)}
                    className="text-indigo-500 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {comp}
                  </button>
                </span>
              ))}
            </p>
          )}
          <SourceLinks urls={citation.sourceUrls} />
        </div>
      </div>
    </div>
  );
}

/** Single citation card — side-by-side view */
function CitationCardSideBySide({
  citation,
  onCompetitorClick,
}: {
  citation: BrandCitation;
  onCompetitorClick: (name: string) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      {/* Query header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <span className="flex-shrink-0">
          {citation.brandMentioned ? (
            <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
        <p className="flex-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {citation.query}
        </p>
        <TrendIndicator trend={citation.trend} />
        {citation.isCustom && (
          <span className="inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-950 dark:text-violet-400">
            Custom
          </span>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
        {/* Claude column */}
        <div className="p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ModelBadge label="C" active={citation.claudeMentioned} />
            <span className="text-[10px] font-semibold text-zinc-500">Claude</span>
            {citation.claudeSentiment && SENTIMENT_BADGES[citation.claudeSentiment] && (
              <span className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold ${SENTIMENT_BADGES[citation.claudeSentiment].color}`}>
                {SENTIMENT_BADGES[citation.claudeSentiment].label}
              </span>
            )}
          </div>
          {citation.claudeContext ? (
            <p className="text-[11px] italic text-zinc-500 line-clamp-3">
              &ldquo;{citation.claudeContext}&rdquo;
            </p>
          ) : (
            <p className="text-[10px] text-zinc-400">
              {citation.claudeMentioned ? "Mentioned (no context extracted)" : "Not mentioned"}
            </p>
          )}
        </div>

        {/* Perplexity column */}
        <div className="p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ModelBadge label="P" active={citation.perplexityMentioned} />
            <span className="text-[10px] font-semibold text-zinc-500">Perplexity</span>
            {citation.perplexitySentiment && SENTIMENT_BADGES[citation.perplexitySentiment] && (
              <span className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold ${SENTIMENT_BADGES[citation.perplexitySentiment].color}`}>
                {SENTIMENT_BADGES[citation.perplexitySentiment].label}
              </span>
            )}
          </div>
          {citation.perplexityContext ? (
            <p className="text-[11px] italic text-zinc-500 line-clamp-3">
              &ldquo;{citation.perplexityContext}&rdquo;
            </p>
          ) : (
            <p className="text-[10px] text-zinc-400">
              {citation.perplexityMentioned ? "Mentioned (no context extracted)" : "Not mentioned"}
            </p>
          )}
          <SourceLinks urls={citation.sourceUrls} />
        </div>
      </div>

      {/* Competitors row */}
      {citation.competitorsMentioned.length > 0 && (
        <div className="border-t border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400">
            Competitors:{" "}
            {citation.competitorsMentioned.map((comp, ci) => (
              <span key={comp}>
                {ci > 0 && ", "}
                <button
                  onClick={() => onCompetitorClick(comp)}
                  className="text-indigo-500 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {comp}
                </button>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

/** Competitor drill-down modal */
function CompetitorDrilldown({
  competitor,
  citations,
  onClose,
}: {
  competitor: string;
  citations: BrandCitation[];
  onClose: () => void;
}) {
  const relevant = citations.filter((c) =>
    c.competitorsMentioned.includes(competitor)
  );

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const c of relevant) {
    // Count sentiment of queries where competitor appears
    if (c.sentiment) sentimentCounts[c.sentiment]++;
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Competitor Drill-down: {competitor}
        </h4>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-3 flex gap-4 text-[11px]">
        <span className="text-zinc-500">
          Appeared in <span className="font-semibold text-zinc-800 dark:text-zinc-200">{relevant.length}</span> of {citations.length} queries
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">
          {sentimentCounts.positive} positive
        </span>
        <span className="text-zinc-500">
          {sentimentCounts.neutral} neutral
        </span>
        <span className="text-red-500">
          {sentimentCounts.negative} negative
        </span>
      </div>

      <div className="space-y-1.5">
        {relevant.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span className="flex-1 text-zinc-700 dark:text-zinc-300">{c.query}</span>
            {c.position != null && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                #{c.position}
              </span>
            )}
            {c.sentiment && SENTIMENT_BADGES[c.sentiment] && (
              <span className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold ${SENTIMENT_BADGES[c.sentiment].color}`}>
                {SENTIMENT_BADGES[c.sentiment].label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function CitationPanel({
  clientId,
  embedded = false,
}: {
  clientId: string;
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CitationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  // Category collapse state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Custom query input
  const [customQuery, setCustomQuery] = useState("");
  const [customLoading, setCustomLoading] = useState(false);

  // Competitor drilldown
  const [drilldownCompetitor, setDrilldownCompetitor] = useState<string | null>(null);

  // On mount, load cached report — if none exists, auto-run analysis
  useEffect(() => {
    let cancelled = false;
    async function loadOrRun() {
      try {
        const res = await fetch(`/api/citations?clientId=${clientId}`);
        const data = await res.json();
        if (!cancelled && data.success && data.report) {
          setReport(data.report);
          setLastRun(data.cachedAt);
          return;
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch("/api/citations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setReport(data.report);
          setLastRun(data.cachedAt || new Date().toISOString());
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadOrRun();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();

      if (data.success) {
        setReport(data.report);
        setLastRun(data.cachedAt || new Date().toISOString());
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function runCustomQueryHandler() {
    if (!customQuery.trim()) return;
    setCustomLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          customQuery: customQuery.trim(),
          customCategory: "Custom",
        }),
      });
      const data = await res.json();

      if (data.success && data.citation) {
        // Append to current report
        setReport((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            citations: [...prev.citations, data.citation],
          };
        });
        setCustomQuery("");
      } else {
        setError(data.error || "Custom query failed");
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setCustomLoading(false);
    }
  }

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleCompetitorClick = useCallback((name: string) => {
    setDrilldownCompetitor(name);
  }, []);

  // Group citations by category
  const groupedCitations = useMemo(() => {
    if (!report) return new Map<string, BrandCitation[]>();
    const groups = new Map<string, BrandCitation[]>();
    for (const c of report.citations) {
      const cat = c.category || "Uncategorised";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(c);
    }
    return groups;
  }, [report]);

  function exportCsv() {
    if (!report) return;
    const csv = citationsToCsv(report.citations, report.clientName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation-report-${report.clientName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const content = (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            LLM Citation Monitor
          </h2>
          <p className="text-xs text-zinc-500">
            Track how AI models represent the client vs competitors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRun && (
            <span className="text-xs text-zinc-400">
              {timeAgo(lastRun)}
            </span>
          )}
          {report && !loading && (
            <button
              onClick={exportCsv}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Analysing..." : report ? "Refresh" : "Run Analysis"}
          </button>
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
          <p className="text-sm text-zinc-500 animate-pulse">
            Querying Claude &amp; Perplexity across 10 industry questions...
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            This takes 20-30 seconds
          </p>
        </div>
      )}

      {/* Results */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Visibility Score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p
                className={`text-5xl font-bold tracking-tight ${visibilityColor(report.overallVisibility)}`}
              >
                {report.overallVisibility}%
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                AI Visibility Score
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                Claude: {report.claudeVisibility}% | Perplexity:{" "}
                {report.perplexityVisibility}%
              </p>
            </div>
            <div className="flex-1 text-xs text-zinc-500">
              <p>
                {report.clientName} was mentioned in{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {report.citations.filter((c) => c.brandMentioned).length} of{" "}
                  {report.citations.length}
                </span>{" "}
                industry queries posed to AI assistants.
              </p>
            </div>
          </div>

          {/* Competitor Comparison */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Brand Visibility Comparison
            </h3>
            <div className="space-y-2">
              {/* Client bar */}
              <div className="flex items-center gap-3">
                <span className="w-36 truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {report.clientName}
                </span>
                <div className="flex-1">
                  <div className="h-5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-5 rounded-full ${barColor(true)} transition-all duration-500`}
                      style={{
                        width: `${Math.max(report.overallVisibility, 2)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {report.overallVisibility}%
                </span>
              </div>
              {/* Competitor bars */}
              {report.competitorComparison.map((comp) => (
                <div key={comp.name}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCompetitorClick(comp.name)}
                      className="w-36 truncate text-left text-xs text-indigo-600 underline decoration-dotted hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {comp.name}
                    </button>
                    <div className="flex-1">
                      <div className="h-5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-5 rounded-full ${barColor(false)} transition-all duration-500`}
                          style={{
                            width: `${Math.max(comp.visibility, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-xs text-zinc-500">
                      {comp.visibility}%
                    </span>
                  </div>
                  <div className="ml-36 pl-3 mt-0.5">
                    <span className="text-[10px] text-zinc-400">
                      C: {comp.claudeVisibility}% | P:{" "}
                      {comp.perplexityVisibility}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Drill-down */}
          {drilldownCompetitor && (
            <CompetitorDrilldown
              competitor={drilldownCompetitor}
              citations={report.citations}
              onClose={() => setDrilldownCompetitor(null)}
            />
          )}

          {/* View Mode Toggle + Custom Query */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Query-by-Query Results
              </h3>
              <p className="text-[10px] text-zinc-400">
                {report.citations.length} queries across{" "}
                {groupedCitations.size} categories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setViewMode("combined")}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    viewMode === "combined"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  } rounded-l-md`}
                >
                  Combined
                </button>
                <button
                  onClick={() => setViewMode("side-by-side")}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    viewMode === "side-by-side"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  } rounded-r-md`}
                >
                  Side by Side
                </button>
              </div>
            </div>
          </div>

          {/* Custom Query Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !customLoading) runCustomQueryHandler();
              }}
              placeholder="Test a custom query, e.g. &quot;Who are the best water retailers in the UK?&quot;"
              className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            />
            <button
              onClick={runCustomQueryHandler}
              disabled={customLoading || !customQuery.trim()}
              className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {customLoading ? "Testing..." : "Test Query"}
            </button>
          </div>

          {/* Categorised Query Results */}
          <div className="space-y-4">
            {Array.from(groupedCitations.entries()).map(
              ([category, citations]) => {
                const isCollapsed = collapsedCategories.has(category);
                const mentionedCount = citations.filter(
                  (c) => c.brandMentioned
                ).length;

                return (
                  <div key={category}>
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="mb-2 flex w-full items-center gap-2 text-left"
                    >
                      <svg
                        className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {category}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {mentionedCount}/{citations.length} mentioned
                      </span>
                    </button>

                    {/* Citation cards */}
                    {!isCollapsed && (
                      <div className="space-y-2 pl-5">
                        {citations.map((citation, i) =>
                          viewMode === "combined" ? (
                            <CitationCardCombined
                              key={`${category}-${i}`}
                              citation={citation}
                              onCompetitorClick={handleCompetitorClick}
                            />
                          ) : (
                            <CitationCardSideBySide
                              key={`${category}-${i}`}
                              citation={citation}
                              onCompetitorClick={handleCompetitorClick}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Recommendations
            </h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border border-zinc-100 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  <span className="flex-shrink-0 font-semibold text-indigo-500">
                    {i + 1}.
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Analysis will run automatically. Click &ldquo;Refresh&rdquo; to update
          manually.
        </p>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-lg border-t-4 border-indigo-500 bg-white p-6 shadow-sm dark:bg-zinc-900">
      {content}
    </div>
  );
}
