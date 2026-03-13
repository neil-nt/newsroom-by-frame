"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CompetitorRow {
  name: string;
  website: string;
}

interface FormData {
  /* Step 1 */
  name: string;
  industry: string;
  website: string;
  description: string;
  /* Step 2 */
  competitors: CompetitorRow[];
  /* Step 3 */
  topics: string[];
  /* Step 4 */
  keyMessages: string;
  spokespeople: string[];
  toneOfVoice: string;
}

const STEPS = [
  "Client Basics",
  "Competitive Landscape",
  "Topics & Keywords",
  "Brand Voice",
  "Review & Launch",
] as const;

const INDUSTRY_TOPIC_SUGGESTIONS: Record<string, string[]> = {
  water: [
    "Water regulation",
    "Ofwat",
    "Sustainability",
    "Water quality",
    "Infrastructure investment",
    "Business utilities",
  ],
  energy: [
    "Energy prices",
    "Net zero",
    "Renewables",
    "Ofgem",
    "Smart meters",
    "Energy policy",
  ],
  technology: [
    "AI & automation",
    "Cybersecurity",
    "Digital transformation",
    "SaaS",
    "Funding rounds",
    "Regulation",
  ],
  finance: [
    "Interest rates",
    "Fintech",
    "ESG investing",
    "Regulation",
    "Cryptocurrency",
    "Banking trends",
  ],
  healthcare: [
    "NHS policy",
    "Digital health",
    "Medical research",
    "Health tech",
    "Patient safety",
    "Workforce",
  ],
  property: [
    "Housing market",
    "Commercial property",
    "Planning policy",
    "Sustainability",
    "Build-to-rent",
    "PropTech",
  ],
  default: [
    "Industry trends",
    "Regulation",
    "Sustainability",
    "Innovation",
    "Market outlook",
    "Competition",
  ],
};

function emptyCompetitors(count: number): CompetitorRow[] {
  return Array.from({ length: count }, () => ({ name: "", website: "" }));
}

function emptyStrings(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

/* ------------------------------------------------------------------ */
/*  Progress indicator                                                 */
/* ------------------------------------------------------------------ */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : done
                      ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900"
                      : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
                }`}
              >
                {done ? "\u2713" : i + 1}
              </div>
              <span
                className={`mt-1 hidden text-[10px] sm:block ${
                  active
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 ${
                  i < current
                    ? "bg-zinc-700 dark:bg-zinc-300"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard                                                             */
/* ------------------------------------------------------------------ */

export function OnboardWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    industry: "",
    website: "",
    description: "",
    competitors: emptyCompetitors(3),
    topics: emptyStrings(3),
    keyMessages: "",
    spokespeople: [""],
    toneOfVoice: "",
  });

  /* ---------- helpers ---------- */

  function patch(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function canAdvance(): boolean {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  }

  function next() {
    if (canAdvance() && step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  /* ---------- topic suggestions ---------- */

  function suggestedTopics(): string[] {
    const key = form.industry.toLowerCase().trim();
    for (const [k, v] of Object.entries(INDUSTRY_TOPIC_SUGGESTIONS)) {
      if (key.includes(k)) return v;
    }
    return INDUSTRY_TOPIC_SUGGESTIONS.default;
  }

  function addSuggestedTopic(topic: string) {
    if (form.topics.some((t) => t.toLowerCase() === topic.toLowerCase()))
      return;
    const firstEmpty = form.topics.findIndex((t) => !t.trim());
    if (firstEmpty !== -1) {
      const updated = [...form.topics];
      updated[firstEmpty] = topic;
      patch({ topics: updated });
    } else if (form.topics.length < 12) {
      patch({ topics: [...form.topics, topic] });
    }
  }

  /* ---------- submit ---------- */

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          website: form.website,
          description: form.description,
          competitors: form.competitors.filter((c) => c.name.trim()),
          topics: form.topics.filter((t) => t.trim()),
          keyMessages: form.keyMessages,
          spokespeople: form.spokespeople.filter((s) => s.trim()),
          toneOfVoice: form.toneOfVoice,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      const { id } = await res.json();
      router.push(`/dashboard?client=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  /* ---------- computed counts for review ---------- */

  const competitorCount = form.competitors.filter((c) => c.name.trim()).length;
  const topicCount = form.topics.filter((t) => t.trim()).length;
  // 1 source per client name + 1 per competitor + optionally 1 for industry
  const sourceCount =
    1 + competitorCount + (form.industry.trim() ? 1 : 0);

  /* ---------- render ---------- */

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500";
  const labelClass =
    "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <div>
      <StepIndicator current={step} />

      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* ── Step 1: Client Basics ── */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Client Basics
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Tell us about the client you&apos;re setting up.
            </p>

            <div>
              <label className={labelClass}>
                Client name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Castle Water"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Industry / sector</label>
              <input
                className={inputClass}
                placeholder="e.g. Water, Energy, Technology"
                value={form.industry}
                onChange={(e) => patch({ industry: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Website URL</label>
              <input
                className={inputClass}
                placeholder="https://..."
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Brief description</label>
              <textarea
                className={inputClass + " min-h-[80px] resize-y"}
                placeholder="What does this company do? What are they known for?"
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Competitive Landscape ── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Competitive Landscape
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Who are {form.name || "the client"}&apos;s main competitors? We&apos;ll
              track their media activity automatically.
            </p>

            <div className="space-y-3">
              {form.competitors.map((comp, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    className={inputClass + " flex-1"}
                    placeholder={`Competitor ${i + 1} name`}
                    value={comp.name}
                    onChange={(e) => {
                      const updated = [...form.competitors];
                      updated[i] = { ...comp, name: e.target.value };
                      patch({ competitors: updated });
                    }}
                  />
                  <input
                    className={inputClass + " flex-1"}
                    placeholder="Website (optional)"
                    value={comp.website}
                    onChange={(e) => {
                      const updated = [...form.competitors];
                      updated[i] = { ...comp, website: e.target.value };
                      patch({ competitors: updated });
                    }}
                  />
                  {form.competitors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.competitors.filter(
                          (_, j) => j !== i,
                        );
                        patch({ competitors: updated });
                      }}
                      className="shrink-0 rounded-lg px-2 text-zinc-400 hover:text-red-500"
                      title="Remove"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {form.competitors.length < 8 && (
              <button
                type="button"
                onClick={() =>
                  patch({
                    competitors: [
                      ...form.competitors,
                      { name: "", website: "" },
                    ],
                  })
                }
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                + Add competitor
              </button>
            )}
          </div>
        )}

        {/* ── Step 3: Topics & Keywords ── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Topics &amp; Keywords
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              What topics should we monitor for {form.name || "this client"}?
            </p>

            {/* Suggestions */}
            <div>
              <span className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Suggested topics
                {form.industry ? ` for ${form.industry}` : ""}:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics().map((t) => {
                  const alreadyAdded = form.topics.some(
                    (existing) =>
                      existing.toLowerCase() === t.toLowerCase(),
                  );
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addSuggestedTopic(t)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        alreadyAdded
                          ? "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-400"
                      }`}
                    >
                      {alreadyAdded ? "\u2713 " : "+ "}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {form.topics.map((topic, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    className={inputClass + " flex-1"}
                    placeholder={`Topic ${i + 1}`}
                    value={topic}
                    onChange={(e) => {
                      const updated = [...form.topics];
                      updated[i] = e.target.value;
                      patch({ topics: updated });
                    }}
                  />
                  {form.topics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.topics.filter(
                          (_, j) => j !== i,
                        );
                        patch({ topics: updated });
                      }}
                      className="shrink-0 rounded-lg px-2 text-zinc-400 hover:text-red-500"
                      title="Remove"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {form.topics.length < 12 && (
              <button
                type="button"
                onClick={() => patch({ topics: [...form.topics, ""] })}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                + Add topic
              </button>
            )}
          </div>
        )}

        {/* ── Step 4: Brand Voice ── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Brand Voice
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Help us understand how {form.name || "the client"} communicates.
            </p>

            <div>
              <label className={labelClass}>Key messages</label>
              <textarea
                className={inputClass + " min-h-[100px] resize-y"}
                placeholder="What does the client want to be known for? What are their core messages?"
                value={form.keyMessages}
                onChange={(e) => patch({ keyMessages: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Tone of voice</label>
              <textarea
                className={inputClass + " min-h-[60px] resize-y"}
                placeholder="e.g. Authoritative but approachable. Data-led. Avoids jargon."
                value={form.toneOfVoice}
                onChange={(e) => patch({ toneOfVoice: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label className={labelClass}>Spokespeople</label>
              {form.spokespeople.map((sp, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    className={inputClass + " flex-1"}
                    placeholder={`Spokesperson ${i + 1} name`}
                    value={sp}
                    onChange={(e) => {
                      const updated = [...form.spokespeople];
                      updated[i] = e.target.value;
                      patch({ spokespeople: updated });
                    }}
                  />
                  {form.spokespeople.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.spokespeople.filter(
                          (_, j) => j !== i,
                        );
                        patch({ spokespeople: updated });
                      }}
                      className="shrink-0 rounded-lg px-2 text-zinc-400 hover:text-red-500"
                      title="Remove"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch({ spokespeople: [...form.spokespeople, ""] })
                }
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                + Add spokesperson
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Review & Launch ── */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Review &amp; Launch
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Check everything looks right, then launch.
            </p>

            {/* Summary sections */}
            <div className="space-y-4">
              <SummarySection title="Client">
                <SummaryRow label="Name" value={form.name} />
                {form.industry && (
                  <SummaryRow label="Industry" value={form.industry} />
                )}
                {form.website && (
                  <SummaryRow label="Website" value={form.website} />
                )}
                {form.description && (
                  <SummaryRow label="Description" value={form.description} />
                )}
              </SummarySection>

              {competitorCount > 0 && (
                <SummarySection title={`Competitors (${competitorCount})`}>
                  {form.competitors
                    .filter((c) => c.name.trim())
                    .map((c, i) => (
                      <SummaryRow
                        key={i}
                        label={c.name}
                        value={c.website || "—"}
                      />
                    ))}
                </SummarySection>
              )}

              {topicCount > 0 && (
                <SummarySection title={`Topics (${topicCount})`}>
                  <div className="flex flex-wrap gap-2">
                    {form.topics
                      .filter((t) => t.trim())
                      .map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                  </div>
                </SummarySection>
              )}

              {(form.keyMessages || form.toneOfVoice) && (
                <SummarySection title="Brand Voice">
                  {form.keyMessages && (
                    <SummaryRow label="Key messages" value={form.keyMessages} />
                  )}
                  {form.toneOfVoice && (
                    <SummaryRow label="Tone" value={form.toneOfVoice} />
                  )}
                  {form.spokespeople.filter((s) => s.trim()).length > 0 && (
                    <SummaryRow
                      label="Spokespeople"
                      value={form.spokespeople
                        .filter((s) => s.trim())
                        .join(", ")}
                    />
                  )}
                </SummarySection>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  What will be created:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>1 client record</li>
                  {competitorCount > 0 && (
                    <li>
                      {competitorCount} competitor
                      {competitorCount !== 1 ? "s" : ""}
                    </li>
                  )}
                  {topicCount > 0 && (
                    <li>
                      {topicCount} topic{topicCount !== 1 ? "s" : ""}
                    </li>
                  )}
                  <li>
                    {sourceCount} auto-generated news source
                    {sourceCount !== 1 ? "s" : ""}
                  </li>
                  {form.spokespeople.filter((s) => s.trim()).length > 0 && (
                    <li>
                      {form.spokespeople.filter((s) => s.trim()).length}{" "}
                      spokesperson
                      {form.spokespeople.filter((s) => s.trim()).length !== 1
                        ? "s"
                        : ""}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-800">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="rounded-lg border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance()}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Creating\u2026" : "Launch Client"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary helpers                                                    */
/* ------------------------------------------------------------------ */

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-28 shrink-0 font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}
