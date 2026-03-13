"use client";

import { useState, useEffect } from "react";
import { WhiteSpaceDetail } from "./whitespace-detail";

interface EvidenceSource {
  title: string;
  url: string | null;
  sourceName: string;
  relevance: string;
}

interface WhiteSpaceOpportunity {
  id?: string;
  topic: string;
  opportunity: string;
  suggestedHeadline: string;
  score: number;
  timing: string;
  triggerType: "gap" | "trend" | "calendar" | "competitor_silence";
  theGap: string;
  yourAdvantage: string;
  theWindow: string;
  evidenceSources: EvidenceSource[];
  calendarEvent: string | null;
  calendarDate: string | null;
  competitorSilence: string;
  actionSteps: string[];
  pitchAngle: string;
  spokespersonBrief: string;
  spokesperson: string | null;
  pitchTo: string[];
  relevantDataPoints: string[];
  status?: string;
}

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  gap: { label: "Gap", color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
  trend: { label: "Trend", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  calendar: { label: "Calendar", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  competitor_silence: { label: "Competitor gap", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pitched: { label: "Pitched", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  in_progress: { label: "In progress", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  published: { label: "Published", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" },
  dismissed: { label: "Dismissed", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
};

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

export function WhiteSpacePanel({ clientId, embedded = false }: { clientId: string; embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<WhiteSpaceOpportunity[] | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<{ id: string; createdAt: string } | null>(null);

  // Load saved opportunities on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch(`/api/whitespace?clientId=${clientId}`);
        const data = await res.json();
        if (data.success && data.opportunities?.length > 0) {
          setOpportunities(data.opportunities);
          setMetadata(data.metadata);
          setLastRun(data.run);
        }
      } catch {
        /* ignore — user can still run a fresh scan */
      }
    }
    loadSaved();
  }, [clientId]);

  async function runRadar() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whitespace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();

      if (data.success) {
        setOpportunities(data.opportunities);
        setMetadata(data.metadata);
        setLastRun(data.run);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            White Space Radar
          </h2>
          <p className="text-xs text-zinc-500">
            Proactive opportunities where the client can own the narrative
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-zinc-400">
              Last run: {timeAgo(lastRun.createdAt)}
            </span>
          )}
          <button
            onClick={runRadar}
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Run Radar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {loading && (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500 animate-pulse">
            Analysing media landscape, competitor activity, and editorial calendar...
          </p>
          <p className="mt-1 text-xs text-zinc-400">This takes 15-30 seconds</p>
        </div>
      )}

      {opportunities && !loading && (
        <>
          {metadata && (
            <p className="mb-4 text-xs text-zinc-400">
              Scanned {String(metadata.rawItemsAnalyzed)} articles from{" "}
              {Array.isArray(metadata.sourcesScanned)
                ? `${metadata.sourcesScanned.length} sources (${(metadata.sourcesScanned as string[]).slice(0, 4).join(", ")}${(metadata.sourcesScanned as string[]).length > 4 ? "..." : ""})`
                : "multiple sources"
              }
              {" "}&middot; {String(metadata.topicClustersFound)} topic clusters
              {" "}&middot; {String(metadata.upcomingCalendarEvents)} calendar events matched
            </p>
          )}

          {opportunities.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              No white space opportunities detected. Try running ingestion first to gather more data.
            </p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp, i) => {
                const trigger = TRIGGER_LABELS[opp.triggerType] || TRIGGER_LABELS.gap;
                const statusInfo = opp.status && opp.status !== "new" ? STATUS_LABELS[opp.status] : null;

                return (
                  <button
                    key={opp.id || i}
                    onClick={() => setSelectedIndex(i)}
                    className="w-full text-left rounded-md border border-zinc-100 p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/30 dark:border-zinc-800 dark:hover:border-violet-800 dark:hover:bg-violet-950/20"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${trigger.color}`}>
                        {trigger.label}
                      </span>
                      {statusInfo && (
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {Math.round(opp.score * 100)}%
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {opp.timing}
                      </span>
                      {opp.evidenceSources?.length > 0 && (
                        <span className="text-[10px] text-zinc-400">
                          {opp.evidenceSources.length} source{opp.evidenceSources.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-violet-500">View details &rarr;</span>
                    </div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {opp.suggestedHeadline}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      {opp.opportunity}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {!opportunities && !loading && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Click &ldquo;Run Radar&rdquo; to scan for proactive media opportunities.
        </p>
      )}
    </>
  );

  // Slide-out detail panel (always rendered outside any card wrapper)
  const detailPanel = selectedIndex !== null && opportunities && opportunities[selectedIndex] && (
    <WhiteSpaceDetail
      opportunity={opportunities[selectedIndex]}
      onClose={() => setSelectedIndex(null)}
    />
  );

  if (embedded) {
    return (
      <>
        {content}
        {detailPanel}
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border-t-4 border-violet-500 bg-white p-6 shadow-sm dark:bg-zinc-900">
        {content}
      </div>
      {detailPanel}
    </>
  );
}
