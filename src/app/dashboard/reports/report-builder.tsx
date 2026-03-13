"use client";

import { useState, useCallback } from "react";

type BriefSection =
  | "summary"
  | "metrics"
  | "alerts"
  | "sov"
  | "whitespace"
  | "journalists"
  | "recommendations";

interface SectionConfig {
  id: BriefSection;
  label: string;
  description: string;
  defaultOn: boolean;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: "summary",
    label: "Executive Summary",
    description: "AI-generated overview of the week's media landscape and key takeaways.",
    defaultOn: true,
  },
  {
    id: "metrics",
    label: "Key Metrics",
    description: "At-a-glance numbers: total alerts, breaking count, share of voice, and opportunities.",
    defaultOn: true,
  },
  {
    id: "alerts",
    label: "Top Alerts",
    description: "The most important alerts from the past 7 days, ranked by urgency.",
    defaultOn: true,
  },
  {
    id: "sov",
    label: "Share of Voice",
    description: "Comparative brand visibility across all monitored media sources.",
    defaultOn: true,
  },
  {
    id: "whitespace",
    label: "White Space Opportunities",
    description: "Uncovered media angles where the client can establish thought leadership.",
    defaultOn: true,
  },
  {
    id: "journalists",
    label: "Active Journalists",
    description: "Most active journalists covering your sector this week.",
    defaultOn: false,
  },
  {
    id: "recommendations",
    label: "Recommended Actions",
    description: "AI-generated action items based on this week's intelligence data.",
    defaultOn: true,
  },
];

interface Props {
  clientId: string;
  clientName: string;
}

export function ReportBuilder({ clientId, clientName }: Props) {
  const [sections, setSections] = useState<{ id: BriefSection; enabled: boolean }[]>(
    SECTION_CONFIGS.map(s => ({ id: s.id, enabled: s.defaultOn })),
  );
  const [email, setEmail] = useState("neil@new-terrain.io");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledSections = sections.filter(s => s.enabled).map(s => s.id);

  const toggleSection = useCallback((id: BriefSection) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setPreviewHtml(null);
    setSent(false);
  }, []);

  const moveSection = useCallback((index: number, direction: "up" | "down") => {
    setSections(prev => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setPreviewHtml(null);
    setSent(false);
  }, []);

  const handlePreview = useCallback(async () => {
    if (enabledSections.length === 0) {
      setError("Select at least one section to preview.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        clientId,
        sections: enabledSections.join(","),
      });
      const res = await fetch(`/api/weekly-brief?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate preview");
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [clientId, enabledSections]);

  const handleSend = useCallback(async () => {
    if (enabledSections.length === 0) {
      setError("Select at least one section to send.");
      return;
    }
    if (!email.trim()) {
      setError("Enter a recipient email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          email: email.trim(),
          sections: enabledSections,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Failed to send report");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }, [clientId, email, enabledSections]);

  const getSectionConfig = (id: BriefSection) =>
    SECTION_CONFIGS.find(s => s.id === id)!;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Report Builder
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configure and send the weekly intelligence brief for {clientName}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left column: section configuration */}
        <div className="space-y-4">
          {/* Section toggles card */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Report Sections
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Toggle sections on or off. Use arrows to reorder.
              </p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sections.map((section, index) => {
                const config = getSectionConfig(section.id);
                return (
                  <div
                    key={section.id}
                    className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                      section.enabled
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50/50 dark:bg-zinc-950/50"
                    }`}
                  >
                    {/* Reorder arrows */}
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <button
                        onClick={() => moveSection(index, "up")}
                        disabled={index === 0}
                        className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        aria-label={`Move ${config.label} up`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSection(index, "down")}
                        disabled={index === sections.length - 1}
                        className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        aria-label={`Move ${config.label} down`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`mt-1 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        section.enabled
                          ? "bg-violet-600"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                      role="switch"
                      aria-checked={section.enabled}
                      aria-label={`Toggle ${config.label}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          section.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>

                    {/* Label and description */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          section.enabled
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {config.label}
                      </p>
                      <p
                        className={`mt-0.5 text-xs leading-relaxed ${
                          section.enabled
                            ? "text-zinc-500 dark:text-zinc-400"
                            : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      >
                        {config.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipient and actions card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recipient Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setSent(false);
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-violet-500 dark:focus:ring-violet-900"
              placeholder="email@example.com"
            />

            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handlePreview}
                disabled={loading || enabledSections.length === 0}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {loading ? "Generating..." : "Preview Report"}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || sent || enabledSections.length === 0}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
              >
                {sending ? "Sending..." : sent ? "Report Sent" : "Send Report"}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {enabledSections.length} of {sections.length} sections selected
            </p>
          </div>
        </div>

        {/* Right column: preview */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Report Preview
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Click &ldquo;Preview Report&rdquo; to render the email.
            </p>
          </div>
          <div className="p-4">
            {previewHtml ? (
              <div
                className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                style={{ height: "640px" }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Report preview"
                  className="h-full w-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex h-[640px] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto text-zinc-300 dark:text-zinc-600"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
                    Configure sections and click Preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
