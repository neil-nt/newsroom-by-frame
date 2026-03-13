"use client";

import { useState } from "react";

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  immediate: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  today: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  this_week: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  pipeline: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
};

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

interface PitchResult {
  subject: string;
  body: string;
  suggestedOutlets: string[];
  keyMessages: string[];
}

export function AlertCard({ alert, clientId }: { alert: AlertData; clientId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [currentOutcome, setCurrentOutcome] = useState(alert.outcome);
  const [currentCoverageUrl, setCurrentCoverageUrl] = useState(alert.coverageUrl);
  const [currentOutcomeDate, setCurrentOutcomeDate] = useState(alert.outcomeDate);
  const [showCoverageInput, setShowCoverageInput] = useState(false);
  const [coverageUrlInput, setCoverageUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [pitch, setPitch] = useState<PitchResult | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const urgencyStyle = URGENCY_STYLES[alert.urgency] || "bg-zinc-50 text-zinc-700";
  const timeAgo = getTimeAgo(alert.createdAt);

  const saveOutcome = async (outcome: string, coverageUrl?: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, outcome, coverageUrl }),
      });
      if (res.ok) {
        setCurrentOutcome(outcome);
        setCurrentOutcomeDate(new Date());
        if (coverageUrl) setCurrentCoverageUrl(coverageUrl);
        setShowCoverageInput(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const generatePitch = async () => {
    setPitchLoading(true);
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id, clientId }),
      });
      const data = await res.json();
      if (data.success && data.pitch) {
        setPitch(data.pitch);
      }
    } finally {
      setPitchLoading(false);
    }
  };

  const copyPitch = async () => {
    if (!pitch) return;
    const text = `Subject: ${pitch.subject}\n\n${pitch.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let targetMedia: string[] = [];
  let dataPoints: string[] = [];
  try {
    targetMedia = alert.targetMedia ? JSON.parse(alert.targetMedia) : [];
  } catch { /* ignore */ }
  try {
    dataPoints = alert.dataPoints ? JSON.parse(alert.dataPoints) : [];
  } catch { /* ignore */ }

  return (
    <div
      className="rounded-md border border-zinc-100 transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed header — always visible */}
      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${urgencyStyle}`}
          >
            {alert.urgency}
          </span>
          {alert.confidence && (
            <span className="text-[10px] text-zinc-400">
              {Math.round(alert.confidence * 100)}%
            </span>
          )}
          {alert.category && (
            <span className="text-[10px] text-zinc-400">
              {alert.category}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-400">{timeAgo}</span>
          <span className="text-zinc-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>

        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {alert.title}
        </h3>

        <p className={`mt-1 text-xs leading-relaxed text-zinc-500 ${expanded ? "" : "line-clamp-2"}`}>
          {alert.summary}
        </p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 pb-3 pt-3 space-y-3">
          {/* Why it matters */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Why it matters
            </h4>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {alert.whyItMatters}
            </p>
          </div>

          {/* Draft response */}
          {alert.draftResponse && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Draft response
              </h4>
              <blockquote className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 rounded-md p-3 border-l-2 border-zinc-300 dark:border-zinc-600 italic">
                {alert.draftResponse}
              </blockquote>
            </div>
          )}

          {/* Spokesperson */}
          {alert.spokesperson && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Spokesperson:
              </span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                {alert.spokesperson}
              </span>
            </div>
          )}

          {/* Data points */}
          {dataPoints.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Key data points
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {dataPoints.map((dp, i) => (
                  <span
                    key={i}
                    className="inline-flex rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400"
                  >
                    {dp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Target media */}
          {targetMedia.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Target media
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {targetMedia.map((pub, i) => (
                  <span
                    key={i}
                    className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    {pub}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {alert.sourceUrl && (
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View source article →
            </a>
          )}

          {/* Outcome actions */}
          <div
            className="border-t border-zinc-100 dark:border-zinc-800 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {currentOutcome ? (
              <div className="flex items-center gap-2">
                {currentOutcome === "pitched" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    Pitched
                    {currentOutcomeDate && (
                      <span className="text-blue-400 dark:text-blue-500">
                        {new Date(currentOutcomeDate).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                )}
                {currentOutcome === "covered" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                    Covered
                    {currentCoverageUrl && (
                      <a
                        href={currentCoverageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 underline hover:text-green-800 dark:text-green-400"
                      >
                        View →
                      </a>
                    )}
                  </span>
                )}
                {currentOutcome === "dismissed" && (
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Dismissed
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveOutcome("pitched")}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
                  >
                    Mark as Pitched
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowCoverageInput(true)}
                    className="rounded-md border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                  >
                    Mark as Covered
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveOutcome("dismissed")}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    Dismiss
                  </button>
                </div>
                {showCoverageInput && (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Coverage URL (optional)"
                      value={coverageUrlInput}
                      onChange={(e) => setCoverageUrlInput(e.target.value)}
                      className="h-7 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveOutcome("covered", coverageUrlInput || undefined)}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCoverageInput(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Pitch button */}
          <div onClick={(e) => e.stopPropagation()}>
            {!pitch && (
              <button
                type="button"
                disabled={pitchLoading}
                onClick={generatePitch}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {pitchLoading ? "Drafting pitch..." : "Generate Pitch"}
              </button>
            )}

            {/* Pitch result */}
            {pitch && (
              <div className="mt-3 space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Generated Pitch
                  </h4>
                  <button
                    type="button"
                    onClick={copyPitch}
                    className="shrink-0 rounded-md border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-zinc-800 dark:text-violet-400 dark:hover:bg-zinc-700"
                  >
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </button>
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Subject: {pitch.subject}
                  </p>
                </div>

                <div className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                  {pitch.body}
                </div>

                {pitch.suggestedOutlets.length > 0 && (
                  <div>
                    <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Suggested outlets
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {pitch.suggestedOutlets.map((outlet, i) => (
                        <span
                          key={i}
                          className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                        >
                          {outlet}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {pitch.keyMessages.length > 0 && (
                  <div>
                    <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Key messages
                    </h5>
                    <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {pitch.keyMessages.map((msg, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="shrink-0 text-violet-500">•</span>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
