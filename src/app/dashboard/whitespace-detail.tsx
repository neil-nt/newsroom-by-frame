"use client";

import { useEffect } from "react";

interface EvidenceSource {
  title: string;
  url: string | null;
  sourceName: string;
  relevance: string;
}

interface Opportunity {
  topic: string;
  opportunity: string;
  suggestedHeadline: string;
  score: number;
  timing: string;
  triggerType: string;
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
}

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  gap: { label: "Gap Analysis", color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950" },
  trend: { label: "Trend Velocity", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950" },
  calendar: { label: "Calendar", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950" },
  competitor_silence: { label: "Competitor Gap", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" },
};

export function WhiteSpaceDetail({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  const opp = opportunity;
  const trigger = TRIGGER_LABELS[opp.triggerType] || TRIGGER_LABELS.gap;

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mt-8 mb-8 mx-6 w-full max-w-7xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-xl border-b border-zinc-100 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${trigger.color}`}>
                  {trigger.label}
                </span>
                <span className="rounded-full bg-violet-50 dark:bg-violet-950 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-400">
                  {Math.round(opp.score * 100)}% match
                </span>
                <span className="text-xs text-zinc-400">
                  {opp.timing}
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                {opp.suggestedHeadline}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{opp.opportunity}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 5L5 15M5 5l10 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — two-column layout on larger screens */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Left column — Analysis */}
            <div className="space-y-6">
              <Section title="The Gap" subtitle="What's being discussed and who's missing">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {opp.theGap}
                </p>
              </Section>

              <Section title="Client Advantage" subtitle="Why the client can own this space">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {opp.yourAdvantage}
                </p>
                {opp.relevantDataPoints.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {opp.relevantDataPoints.map((dp, i) => (
                      <span
                        key={i}
                        className="inline-flex rounded-full bg-violet-50 dark:bg-violet-950 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400"
                      >
                        {dp}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="The Window" subtitle="Timing and urgency">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {opp.theWindow}
                </p>
                {opp.calendarEvent && (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950 p-3">
                    <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>{opp.calendarEvent}</strong>
                      {opp.calendarDate && ` — ${new Date(opp.calendarDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                    </span>
                  </div>
                )}
              </Section>

              <Section title="Competitor Silence" subtitle="Who's absent and why that matters">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {opp.competitorSilence}
                </p>
              </Section>
            </div>

            {/* Right column — Action */}
            <div className="space-y-6">
              {/* Pitch Angle — prominent card */}
              <div className="rounded-lg border-l-4 border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-500 mb-2">Pitch angle</p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
                  &ldquo;{opp.pitchAngle}&rdquo;
                </p>
              </div>

              <Section title="Action Plan" subtitle="Recommended next steps">
                <ol className="space-y-3">
                  {opp.actionSteps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-xs font-bold text-violet-700 dark:text-violet-300">
                        {i + 1}
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-0.5">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* Spokesperson Brief */}
              {opp.spokesperson && (
                <Section title="Spokesperson Brief" subtitle={`Prep notes for ${opp.spokesperson}`}>
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {opp.spokespersonBrief}
                  </p>
                </Section>
              )}

              {/* Pitch To */}
              {opp.pitchTo && opp.pitchTo.length > 0 && (
                <Section title="Pitch To" subtitle="Suggested publications to approach">
                  <div className="flex flex-wrap gap-2">
                    {opp.pitchTo.map((pub, i) => (
                      <span
                        key={i}
                        className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        {pub}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Evidence Sources */}
              {opp.evidenceSources && opp.evidenceSources.length > 0 && (
                <Section title="Evidence" subtitle={`${opp.evidenceSources.length} source${opp.evidenceSources.length !== 1 ? "s" : ""} analysed`}>
                  <div className="space-y-2">
                    {opp.evidenceSources.map((source, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-zinc-100 dark:border-zinc-800 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline leading-snug"
                              >
                                {source.title}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                                {source.title}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-zinc-400">{source.sourceName}</p>
                          </div>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs text-blue-500 hover:text-blue-600"
                            >
                              Open &nearr;
                            </a>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                          {source.relevance}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="text-[11px] text-zinc-400 mb-3">{subtitle}</p>
      {children}
    </div>
  );
}
