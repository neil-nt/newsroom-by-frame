"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Client,
  ClientContext,
  Spokesperson,
  Competitor,
  Topic,
  Source,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FullSource = Pick<
  Source,
  "id" | "name" | "type" | "category" | "url" | "active" | "lastFetchedAt"
>;

type ClientWithRelations = Client & {
  context: ClientContext | null;
  spokespeople: Spokesperson[];
  competitors: Competitor[];
  topics: Topic[];
  sources: FullSource[];
};

interface DataPoint {
  metric: string;
  value: string;
  context: string;
}

// ---------------------------------------------------------------------------
// Authority badge styles
// ---------------------------------------------------------------------------

const AUTHORITY_STYLES: Record<string, { label: string; color: string }> = {
  primary: {
    label: "Primary",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  },
  secondary: {
    label: "Secondary",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  emerging: {
    label: "Emerging",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function formatTimestamp(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Flash notification
// ---------------------------------------------------------------------------

function SaveFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400 animate-pulse">
      Saved
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tag / Chip input
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((_, j) => j !== i))}
            className="ml-0.5 text-zinc-400 hover:text-red-500"
          >
            x
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 border-0 bg-transparent py-0.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable list (message pillars, tone examples, avoid topics)
// ---------------------------------------------------------------------------

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            rows={2}
            className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-xs font-medium text-blue-500 hover:text-blue-700"
      >
        + Add
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function Section({
  title,
  count,
  defaultOpen = true,
  children,
  headerRight,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {count !== undefined && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {count}
            </span>
          )}
          {headerRight}
        </div>
        <svg
          className={`h-5 w-5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------

function SaveButton({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex items-center gap-2 pt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <SaveFlash show={saved} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function patchClient(
  clientId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`/api/clients/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Save failed (${res.status})`
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// useSaveFlash hook
// ---------------------------------------------------------------------------

function useSaveFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = useCallback(() => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2000);
  }, []);
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return { saved, flash };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClientProfile({ client: initialClient }: { client: ClientWithRelations }) {
  const [client, setClient] = useState(initialClient);
  const [editing, setEditing] = useState(false);

  const ctx = client.context;

  // Parse JSON fields
  const messagePillars = ctx ? safeParse<string[]>(ctx.messagePillars, []) : [];
  const toneExamples = ctx ? safeParse<string[]>(ctx.toneExamples, []) : [];
  const avoidTopics = ctx ? safeParse<string[]>(ctx.avoidTopics, []) : [];
  const dataPoints = ctx ? safeParse<DataPoint[]>(ctx.dataPoints, []) : [];
  const brandAliases = ctx ? safeParse<string[]>(ctx.brandAliases, []) : [];

  // Source counts by type (active only for read mode)
  const activeSources = client.sources.filter((s) => s.active);
  const sourceCounts: Record<string, number> = {};
  for (const s of activeSources) {
    sourceCounts[s.type] = (sourceCounts[s.type] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {editing ? (
            <EditBasicsInline client={client} onSaved={setClient} />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {client.name}
              </h1>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {client.slug}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  client.active
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                {client.active ? "Active" : "Inactive"}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            editing
              ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {editing ? "Done Editing" : "Edit Profile"}
        </button>
      </div>

      {/* ── Brand Identity (edit mode only, or if aliases exist) ── */}
      {editing ? (
        <EditBrandIdentity
          clientId={client.id}
          aliases={brandAliases}
          onSaved={(newAliases) => {
            if (ctx) {
              setClient({
                ...client,
                context: { ...ctx, brandAliases: JSON.stringify(newAliases) },
              });
            }
          }}
        />
      ) : (
        brandAliases.length > 0 && (
          <Section title="Brand Identity" defaultOpen={true}>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Brand keyword aliases
              </h3>
              <p className="mb-2 text-[11px] text-zinc-400">
                These keywords help the system find mentions of this brand in
                media coverage
              </p>
              <div className="flex flex-wrap gap-2">
                {brandAliases.map((alias, i) => (
                  <span
                    key={i}
                    className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )
      )}

      {/* ── Positioning & Voice ─────────────────────────────── */}
      {ctx &&
        (editing ? (
          <EditPositioningVoice
            clientId={client.id}
            ctx={ctx}
            messagePillars={messagePillars}
            toneExamples={toneExamples}
            avoidTopics={avoidTopics}
            onSaved={(updated) =>
              setClient({ ...client, context: updated })
            }
          />
        ) : (
          <Section title="Positioning & Voice" defaultOpen={true}>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Positioning statement
                </h3>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {ctx.positioning}
                </p>
              </div>

              {messagePillars.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Message pillars
                  </h3>
                  <div className="space-y-2">
                    {messagePillars.map((pillar, i) => {
                      const [label, ...rest] = pillar.split(":");
                      return (
                        <div
                          key={i}
                          className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
                        >
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {label.trim()}
                          </p>
                          {rest.length > 0 && (
                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                              {rest.join(":").trim()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tone of voice
                </h3>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {ctx.toneOfVoice}
                </p>
              </div>

              {toneExamples.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Tone examples
                  </h3>
                  <div className="space-y-2">
                    {toneExamples.map((ex, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-zinc-200 pl-3 text-xs italic leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        &ldquo;{ex}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              {avoidTopics.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Topics to avoid
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {avoidTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        ))}

      {/* ── Key Data Points ─────────────────────────────────── */}
      {editing ? (
        <EditDataPoints
          clientId={client.id}
          dataPoints={dataPoints}
          onSaved={(dp) => {
            if (ctx) {
              setClient({
                ...client,
                context: { ...ctx, dataPoints: JSON.stringify(dp) },
              });
            }
          }}
        />
      ) : (
        dataPoints.length > 0 && (
          <Section
            title="Key Data Points"
            count={dataPoints.length}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dataPoints.map((dp, i) => (
                <div
                  key={i}
                  className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <p className="text-xs text-zinc-400">{dp.metric}</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {dp.value}
                  </p>
                  <p className="text-xs text-zinc-500">{dp.context}</p>
                </div>
              ))}
            </div>
          </Section>
        )
      )}

      {/* ── Spokespeople ────────────────────────────────────── */}
      {editing ? (
        <EditSpokespeople
          clientId={client.id}
          spokespeople={client.spokespeople}
          onChanged={(sp) => setClient({ ...client, spokespeople: sp })}
        />
      ) : (
        client.spokespeople.length > 0 && (
          <Section
            title="Spokespeople"
            count={client.spokespeople.length}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {client.spokespeople.map((sp) => {
                const expertise = safeParse<string[]>(sp.expertise, []);
                return (
                  <div
                    key={sp.id}
                    className="rounded-md border border-zinc-100 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {sp.name}
                        </h4>
                        <p className="text-xs text-zinc-500">{sp.role}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          sp.active
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {sp.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {sp.bio && (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        {sp.bio}
                      </p>
                    )}

                    {sp.mediaStyle && (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Media style
                        </p>
                        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {sp.mediaStyle}
                        </p>
                      </div>
                    )}

                    {expertise.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Expertise
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {expertise.map((exp, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )
      )}

      {/* ── Competitors ─────────────────────────────────────── */}
      {editing ? (
        <EditCompetitors
          clientId={client.id}
          competitors={client.competitors}
          onChanged={(c) => setClient({ ...client, competitors: c })}
        />
      ) : (
        client.competitors.length > 0 && (
          <Section
            title="Competitors"
            count={client.competitors.length}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {client.competitors.map((comp) => {
                const strengths = safeParse<string[]>(comp.strengths, []);
                const weaknesses = safeParse<string[]>(comp.weaknesses, []);
                return (
                  <div
                    key={comp.id}
                    className="rounded-md border border-zinc-100 p-4 dark:border-zinc-800"
                  >
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {comp.name}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {comp.position}
                    </p>
                    <p className="mt-1 text-xs italic text-zinc-400">
                      {comp.messaging}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {strengths.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                            Strengths
                          </p>
                          <ul className="space-y-0.5">
                            {strengths.map((s, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-zinc-600 dark:text-zinc-400"
                              >
                                + {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {weaknesses.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                            Weaknesses
                          </p>
                          <ul className="space-y-0.5">
                            {weaknesses.map((w, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-zinc-600 dark:text-zinc-400"
                              >
                                - {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )
      )}

      {/* ── Topics Being Monitored ──────────────────────────── */}
      {editing ? (
        <EditTopics
          clientId={client.id}
          topics={client.topics}
          onChanged={(t) => setClient({ ...client, topics: t })}
        />
      ) : (
        client.topics.length > 0 && (
          <Section
            title="Topics Being Monitored"
            count={client.topics.length}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {(["primary", "secondary", "emerging"] as const).map((level) => {
                const levelTopics = client.topics.filter(
                  (t) => t.authority === level
                );
                if (levelTopics.length === 0) return null;
                const style = AUTHORITY_STYLES[level] ?? {
                  label: level,
                  color: "bg-zinc-100 text-zinc-700",
                };
                return (
                  <div key={level}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {style.label} authority
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {levelTopics.map((t) => {
                        const keywords = safeParse<string[]>(t.keywords, []);
                        return (
                          <div
                            key={t.id}
                            className={`rounded-md px-3 py-2 ${style.color}`}
                          >
                            <p className="text-xs font-semibold">{t.name}</p>
                            {keywords.length > 0 && (
                              <p className="mt-0.5 text-[10px] opacity-75">
                                {keywords.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )
      )}

      {/* ── Sources ──────────────────────────────────────────── */}
      {editing ? (
        <EditSources
          clientId={client.id}
          sources={client.sources}
          onChanged={(s) => setClient({ ...client, sources: s })}
        />
      ) : (
        activeSources.length > 0 && (
          <Section
            title="Active Sources"
            count={activeSources.length}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(sourceCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {type}
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {count}
                      </span>
                    </span>
                  ))}
              </div>

              <div className="overflow-hidden rounded-md border border-zinc-100 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                        Name
                      </th>
                      <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                        Type
                      </th>
                      <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                        Category
                      </th>
                      <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                        URL
                      </th>
                      <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                        Last fetched
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {activeSources.map((source) => (
                      <tr key={source.id}>
                        <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {source.name}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {source.type}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {source.category}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2">
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {source.url
                                .replace(/^https?:\/\/(www\.)?/, "")
                                .slice(0, 40)}
                            </a>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">
                              --
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">
                          {formatTimestamp(source.lastFetchedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )
      )}
    </div>
  );
}

// ===========================================================================
// EDIT SUB-COMPONENTS
// ===========================================================================

// ---------------------------------------------------------------------------
// Edit Basics (name + slug inline)
// ---------------------------------------------------------------------------

function EditBasicsInline({
  client,
  onSaved,
}: {
  client: ClientWithRelations;
  onSaved: (c: ClientWithRelations) => void;
}) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [saving, setSaving] = useState(false);
  const { saved, flash } = useSaveFlash();

  async function save() {
    setSaving(true);
    try {
      await patchClient(client.id, { section: "basics", name, slug });
      onSaved({ ...client, name, slug });
      flash();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-2xl font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
      />
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
      <SaveFlash show={saved} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Brand Identity (keyword aliases)
// ---------------------------------------------------------------------------

function EditBrandIdentity({
  clientId,
  aliases: initial,
  onSaved,
}: {
  clientId: string;
  aliases: string[];
  onSaved: (aliases: string[]) => void;
}) {
  const [aliases, setAliases] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { saved, flash } = useSaveFlash();

  async function save() {
    setSaving(true);
    try {
      await patchClient(clientId, { section: "keywords", aliases });
      onSaved(aliases);
      flash();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Brand Identity" defaultOpen={true}>
      <div className="space-y-3">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Brand keyword aliases
          </h3>
          <p className="mb-2 text-[11px] text-zinc-400">
            These keywords help the system find mentions of this brand in media
            coverage. Press Enter or comma to add.
          </p>
          <TagInput
            tags={aliases}
            onChange={setAliases}
            placeholder="Add a keyword alias..."
          />
        </div>
        <SaveButton onClick={save} saving={saving} saved={saved} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Edit Positioning & Voice
// ---------------------------------------------------------------------------

function EditPositioningVoice({
  clientId,
  ctx,
  messagePillars: initialPillars,
  toneExamples: initialExamples,
  avoidTopics: initialAvoid,
  onSaved,
}: {
  clientId: string;
  ctx: ClientContext;
  messagePillars: string[];
  toneExamples: string[];
  avoidTopics: string[];
  onSaved: (ctx: ClientContext) => void;
}) {
  const [positioning, setPositioning] = useState(ctx.positioning);
  const [pillars, setPillars] = useState(initialPillars);
  const [toneOfVoice, setToneOfVoice] = useState(ctx.toneOfVoice);
  const [examples, setExamples] = useState(initialExamples);
  const [avoid, setAvoid] = useState(initialAvoid);
  const [saving, setSaving] = useState(false);
  const { saved, flash } = useSaveFlash();

  async function save() {
    setSaving(true);
    try {
      const updated = (await patchClient(clientId, {
        section: "context",
        positioning,
        messagePillars: pillars,
        toneOfVoice,
        toneExamples: examples,
        avoidTopics: avoid,
      })) as ClientContext;
      onSaved(updated);
      flash();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Positioning & Voice" defaultOpen={true}>
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Positioning statement
          </h3>
          <textarea
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Message pillars
          </h3>
          <EditableList
            items={pillars}
            onChange={setPillars}
            placeholder="Pillar: description..."
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Tone of voice
          </h3>
          <textarea
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Tone examples
          </h3>
          <EditableList
            items={examples}
            onChange={setExamples}
            placeholder="Example quote..."
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Topics to avoid
          </h3>
          <TagInput tags={avoid} onChange={setAvoid} placeholder="Add topic to avoid..." />
        </div>

        <SaveButton onClick={save} saving={saving} saved={saved} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Edit Data Points
// ---------------------------------------------------------------------------

function EditDataPoints({
  clientId,
  dataPoints: initial,
  onSaved,
}: {
  clientId: string;
  dataPoints: DataPoint[];
  onSaved: (dp: DataPoint[]) => void;
}) {
  const [points, setPoints] = useState<DataPoint[]>(initial);
  const [saving, setSaving] = useState(false);
  const { saved, flash } = useSaveFlash();

  function update(i: number, field: keyof DataPoint, value: string) {
    const next = [...points];
    next[i] = { ...next[i], [field]: value };
    setPoints(next);
  }

  async function save() {
    setSaving(true);
    try {
      await patchClient(clientId, { section: "context", dataPoints: points });
      onSaved(points);
      flash();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Key Data Points" count={points.length} defaultOpen={false}>
      <div className="space-y-3">
        {points.map((dp, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
          >
            <div className="grid flex-1 grid-cols-3 gap-2">
              <input
                type="text"
                value={dp.metric}
                onChange={(e) => update(i, "metric", e.target.value)}
                placeholder="Metric"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                type="text"
                value={dp.value}
                onChange={(e) => update(i, "value", e.target.value)}
                placeholder="Value"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                type="text"
                value={dp.context}
                onChange={(e) => update(i, "context", e.target.value)}
                placeholder="Context"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setPoints(points.filter((_, j) => j !== i))}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setPoints([...points, { metric: "", value: "", context: "" }])
          }
          className="text-xs font-medium text-blue-500 hover:text-blue-700"
        >
          + Add data point
        </button>
        <SaveButton onClick={save} saving={saving} saved={saved} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Edit Spokespeople
// ---------------------------------------------------------------------------

function EditSpokespeople({
  clientId,
  spokespeople,
  onChanged,
}: {
  clientId: string;
  spokespeople: Spokesperson[];
  onChanged: (sp: Spokesperson[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Section
      title="Spokespeople"
      count={spokespeople.length}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {spokespeople.map((sp) =>
          editingId === sp.id ? (
            <SpokespersonForm
              key={sp.id}
              clientId={clientId}
              initial={sp}
              onSaved={(updated) => {
                onChanged(
                  spokespeople.map((s) => (s.id === updated.id ? updated : s))
                );
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <SpokespersonCard
              key={sp.id}
              sp={sp}
              onEdit={() => setEditingId(sp.id)}
              onDelete={async () => {
                if (!confirm(`Delete ${sp.name}?`)) return;
                await patchClient(clientId, {
                  section: "spokesperson",
                  action: "delete",
                  spokespersonId: sp.id,
                });
                onChanged(spokespeople.filter((s) => s.id !== sp.id));
              }}
            />
          )
        )}
        {adding ? (
          <SpokespersonForm
            clientId={clientId}
            onSaved={(created) => {
              onChanged([...spokespeople, created]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-md border-2 border-dashed border-zinc-200 py-3 text-xs font-medium text-blue-500 hover:border-blue-300 dark:border-zinc-700"
          >
            + Add Spokesperson
          </button>
        )}
      </div>
    </Section>
  );
}

function SpokespersonCard({
  sp,
  onEdit,
  onDelete,
}: {
  sp: Spokesperson;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const expertise = safeParse<string[]>(sp.expertise, []);
  return (
    <div className="rounded-md border border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {sp.name}
          </h4>
          <p className="text-xs text-zinc-500">{sp.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              sp.active
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {sp.active ? "Active" : "Inactive"}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      {sp.bio && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{sp.bio}</p>
      )}
      {sp.mediaStyle && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Media style
          </p>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {sp.mediaStyle}
          </p>
        </div>
      )}
      {expertise.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Expertise
          </p>
          <div className="flex flex-wrap gap-1.5">
            {expertise.map((exp, i) => (
              <span
                key={i}
                className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpokespersonForm({
  clientId,
  initial,
  onSaved,
  onCancel,
}: {
  clientId: string;
  initial?: Spokesperson;
  onSaved: (sp: Spokesperson) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [expertise, setExpertise] = useState<string[]>(
    initial ? safeParse<string[]>(initial.expertise, []) : []
  );
  const [mediaStyle, setMediaStyle] = useState(initial?.mediaStyle ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    try {
      const result = (await patchClient(clientId, {
        section: "spokesperson",
        action: initial ? "update" : "create",
        spokespersonId: initial?.id,
        data: { name, role, expertise, mediaStyle, bio, active },
      })) as Spokesperson;
      onSaved(result);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Expertise
          </label>
          <TagInput
            tags={expertise}
            onChange={setExpertise}
            placeholder="Add expertise..."
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Media style
          </label>
          <textarea
            value={mediaStyle}
            onChange={(e) => setMediaStyle(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Active
          </label>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              active ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                active ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Competitors
// ---------------------------------------------------------------------------

function EditCompetitors({
  clientId,
  competitors,
  onChanged,
}: {
  clientId: string;
  competitors: Competitor[];
  onChanged: (c: Competitor[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Section
      title="Competitors"
      count={competitors.length}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {competitors.map((comp) =>
          editingId === comp.id ? (
            <CompetitorForm
              key={comp.id}
              clientId={clientId}
              initial={comp}
              onSaved={(updated) => {
                onChanged(
                  competitors.map((c) => (c.id === updated.id ? updated : c))
                );
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CompetitorCard
              key={comp.id}
              comp={comp}
              onEdit={() => setEditingId(comp.id)}
              onDelete={async () => {
                if (!confirm(`Delete ${comp.name}?`)) return;
                await patchClient(clientId, {
                  section: "competitor",
                  action: "delete",
                  competitorId: comp.id,
                });
                onChanged(competitors.filter((c) => c.id !== comp.id));
              }}
            />
          )
        )}
        {adding ? (
          <CompetitorForm
            clientId={clientId}
            onSaved={(created) => {
              onChanged([...competitors, created]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-zinc-200 text-xs font-medium text-blue-500 hover:border-blue-300 dark:border-zinc-700"
          >
            + Add Competitor
          </button>
        )}
      </div>
    </Section>
  );
}

function CompetitorCard({
  comp,
  onEdit,
  onDelete,
}: {
  comp: Competitor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const strengths = safeParse<string[]>(comp.strengths, []);
  const weaknesses = safeParse<string[]>(comp.weaknesses, []);
  return (
    <div className="rounded-md border border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {comp.name}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {comp.position}
          </p>
          <p className="mt-1 text-xs italic text-zinc-400">{comp.messaging}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {strengths.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
              Strengths
            </p>
            <ul className="space-y-0.5">
              {strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-[11px] text-zinc-600 dark:text-zinc-400"
                >
                  + {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Weaknesses
            </p>
            <ul className="space-y-0.5">
              {weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="text-[11px] text-zinc-600 dark:text-zinc-400"
                >
                  - {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitorForm({
  clientId,
  initial,
  onSaved,
  onCancel,
}: {
  clientId: string;
  initial?: Competitor;
  onSaved: (c: Competitor) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [messaging, setMessaging] = useState(initial?.messaging ?? "");
  const [strengths, setStrengths] = useState<string[]>(
    initial ? safeParse<string[]>(initial.strengths, []) : []
  );
  const [weaknesses, setWeaknesses] = useState<string[]>(
    initial ? safeParse<string[]>(initial.weaknesses, []) : []
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = (await patchClient(clientId, {
        section: "competitor",
        action: initial ? "update" : "create",
        competitorId: initial?.id,
        data: { name, position, messaging, strengths, weaknesses },
      })) as Competitor;
      onSaved(result);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Positioning
          </label>
          <textarea
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Messaging
          </label>
          <textarea
            value={messaging}
            onChange={(e) => setMessaging(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Strengths
          </label>
          <TagInput
            tags={strengths}
            onChange={setStrengths}
            placeholder="Add strength..."
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Weaknesses
          </label>
          <TagInput
            tags={weaknesses}
            onChange={setWeaknesses}
            placeholder="Add weakness..."
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Topics
// ---------------------------------------------------------------------------

function EditTopics({
  clientId,
  topics,
  onChanged,
}: {
  clientId: string;
  topics: Topic[];
  onChanged: (t: Topic[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Section
      title="Topics Being Monitored"
      count={topics.length}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {topics.map((topic) =>
          editingId === topic.id ? (
            <TopicForm
              key={topic.id}
              clientId={clientId}
              initial={topic}
              onSaved={(updated) => {
                onChanged(
                  topics.map((t) => (t.id === updated.id ? updated : t))
                );
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TopicCard
              key={topic.id}
              topic={topic}
              onEdit={() => setEditingId(topic.id)}
              onDelete={async () => {
                if (!confirm(`Delete topic "${topic.name}"?`)) return;
                await patchClient(clientId, {
                  section: "topic",
                  action: "delete",
                  topicId: topic.id,
                });
                onChanged(topics.filter((t) => t.id !== topic.id));
              }}
            />
          )
        )}
        {adding ? (
          <TopicForm
            clientId={clientId}
            onSaved={(created) => {
              onChanged([...topics, created]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-md border-2 border-dashed border-zinc-200 py-3 text-xs font-medium text-blue-500 hover:border-blue-300 dark:border-zinc-700"
          >
            + Add Topic
          </button>
        )}
      </div>
    </Section>
  );
}

function TopicCard({
  topic,
  onEdit,
  onDelete,
}: {
  topic: Topic;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const keywords = safeParse<string[]>(topic.keywords, []);
  const style = AUTHORITY_STYLES[topic.authority] ?? {
    label: topic.authority,
    color: "bg-zinc-100 text-zinc-700",
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-md px-3 py-1.5 ${style.color}`}>
          <p className="text-xs font-semibold">{topic.name}</p>
          {keywords.length > 0 && (
            <p className="mt-0.5 text-[10px] opacity-75">
              {keywords.join(", ")}
            </p>
          )}
        </div>
        <span className="text-[10px] text-zinc-400">{style.label}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TopicForm({
  clientId,
  initial,
  onSaved,
  onCancel,
}: {
  clientId: string;
  initial?: Topic;
  onSaved: (t: Topic) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [authority, setAuthority] = useState(initial?.authority ?? "emerging");
  const [keywords, setKeywords] = useState<string[]>(
    initial ? safeParse<string[]>(initial.keywords, []) : []
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = (await patchClient(clientId, {
        section: "topic",
        action: initial ? "update" : "create",
        topicId: initial?.id,
        data: { name, authority, keywords },
      })) as Topic;
      onSaved(result);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Topic name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Authority level
            </label>
            <select
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="emerging">Emerging</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Keywords
          </label>
          <TagInput
            tags={keywords}
            onChange={setKeywords}
            placeholder="Add keyword..."
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Sources
// ---------------------------------------------------------------------------

function EditSources({
  clientId,
  sources,
  onChanged,
}: {
  clientId: string;
  sources: FullSource[];
  onChanged: (s: FullSource[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "rss",
    url: "",
    category: "general",
  });
  const [savingNew, setSavingNew] = useState(false);

  async function toggleSource(sourceId: string) {
    const result = (await patchClient(clientId, {
      section: "source",
      action: "toggle",
      sourceId,
    })) as FullSource;
    onChanged(
      sources.map((s) => (s.id === sourceId ? { ...s, active: result.active } : s))
    );
  }

  async function deleteSource(sourceId: string) {
    if (!confirm("Delete this source?")) return;
    await patchClient(clientId, {
      section: "source",
      action: "delete",
      sourceId,
    });
    onChanged(sources.filter((s) => s.id !== sourceId));
  }

  async function addSource() {
    if (!newSource.name.trim() || !newSource.type.trim()) return;
    setSavingNew(true);
    try {
      const created = (await patchClient(clientId, {
        section: "source",
        action: "create",
        data: newSource,
      })) as FullSource;
      onChanged([...sources, created]);
      setAdding(false);
      setNewSource({ name: "", type: "rss", url: "", category: "general" });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSavingNew(false);
    }
  }

  return (
    <Section title="Sources" count={sources.length} defaultOpen={false}>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border border-zinc-100 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  Active
                </th>
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  Name
                </th>
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  Type
                </th>
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  Category
                </th>
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  URL
                </th>
                <th className="px-3 py-2 font-semibold text-zinc-500 dark:text-zinc-400">
                  Last fetched
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className={
                    source.active ? "" : "opacity-50"
                  }
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSource(source.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        source.active
                          ? "bg-green-500"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          source.active
                            ? "translate-x-4"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {source.name}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{source.type}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {source.category}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {source.url
                          .replace(/^https?:\/\/(www\.)?/, "")
                          .slice(0, 40)}
                      </a>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">
                        --
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {formatTimestamp(source.lastFetchedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => deleteSource(source.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {adding ? (
          <div className="rounded-md border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Name
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) =>
                    setNewSource({ ...newSource, name: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Type
                </label>
                <select
                  value={newSource.type}
                  onChange={(e) =>
                    setNewSource({ ...newSource, type: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="rss">RSS</option>
                  <option value="newsapi">NewsAPI</option>
                  <option value="serp">SERP</option>
                  <option value="twitter">Twitter</option>
                  <option value="reddit">Reddit</option>
                  <option value="eventbrite">Eventbrite</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  URL
                </label>
                <input
                  type="text"
                  value={newSource.url}
                  onChange={(e) =>
                    setNewSource({ ...newSource, url: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Category
                </label>
                <input
                  type="text"
                  value={newSource.category}
                  onChange={(e) =>
                    setNewSource({ ...newSource, category: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={addSource}
                disabled={savingNew}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingNew ? "Adding..." : "Add Source"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-md border-2 border-dashed border-zinc-200 py-3 text-xs font-medium text-blue-500 hover:border-blue-300 dark:border-zinc-700"
          >
            + Add Source
          </button>
        )}
      </div>
    </Section>
  );
}
