"use client";

import { useState, useEffect, useId, useRef, useCallback } from "react";

// ---------- Types ----------

interface DailyDataPoint {
  date: string;
  total: number;
  byBrand: Record<string, number>;
  byTopic: Record<string, number>;
}

interface TrendData {
  clientName: string;
  period: number;
  dailyMentions: DailyDataPoint[];
  brands: string[];
  topics: string[];
  generatedAt: string;
}

// ---------- Constants ----------

const PERIODS = [
  { label: "7d", days: "7" },
  { label: "30d", days: "30" },
  { label: "90d", days: "90" },
] as const;

const BRAND_COLORS = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#22c55e", // green
  "#ec4899", // pink
  "#a855f7", // purple
  "#14b8a6", // teal
  "#eab308", // yellow
  "#ef4444", // red
];

// ---------- Helpers ----------

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ---------- SVG Charts ----------

function InteractiveAreaChart({
  data,
  overlays,
  width,
  height,
  color,
  labels,
  rawDates,
}: {
  data: number[];
  overlays: { name: string; data: number[]; color: string }[];
  width: number;
  height: number;
  color: string;
  labels?: string[];
  rawDates?: string[];
}) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const padTop = 8;
  const padBottom = labels ? 24 : 0;
  const chartHeight = height - padTop - padBottom;

  // Compute max across total + all overlays
  const allValues = [data, ...overlays.map((o) => o.data)];
  const max = Math.max(...allValues.flat(), 1);

  const toPoints = (values: number[]) =>
    values.map((v, i) => ({
      x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
      y: padTop + chartHeight - (v / max) * chartHeight,
    }));

  const toLinePath = (pts: { x: number; y: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

  const mainPoints = toPoints(data);
  const mainLinePath = toLinePath(mainPoints);
  const mainAreaPath = `${mainLinePath} L ${width} ${padTop + chartHeight} L 0 ${padTop + chartHeight} Z`;

  // Y-axis guides
  const ySteps = [0, 0.5, 1];
  const yGuides = ySteps.map((s) => ({
    y: padTop + chartHeight - s * chartHeight,
    label: Math.round(s * max).toString(),
  }));

  // Hover handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || data.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const ratio = relX / rect.width;
      const idx = Math.round(ratio * (data.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
    },
    [data.length]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  // Hover point position
  const hoverX =
    hoverIndex !== null
      ? data.length === 1
        ? width / 2
        : (hoverIndex / (data.length - 1)) * width
      : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis guides */}
        {yGuides.map((g) => (
          <g key={g.y}>
            <line
              x1={0}
              y1={g.y}
              x2={width}
              y2={g.y}
              stroke="currentColor"
              strokeOpacity="0.07"
              strokeWidth="1"
            />
            <text
              x={-4}
              y={g.y + 3}
              textAnchor="end"
              fontSize="9"
              fill="currentColor"
              fillOpacity="0.4"
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Main area + line */}
        <path d={mainAreaPath} fill={`url(#${gradId})`} />
        <path
          d={mainLinePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Overlay brand lines */}
        {overlays.map((overlay) => {
          const pts = toPoints(overlay.data);
          const path = toLinePath(pts);
          return (
            <path
              key={overlay.name}
              d={path}
              fill="none"
              stroke={overlay.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 3"
            />
          );
        })}

        {/* Hover vertical line + dots */}
        {hoverIndex !== null && (
          <>
            <line
              x1={hoverX}
              y1={padTop}
              x2={hoverX}
              y2={padTop + chartHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            {/* Main dot */}
            <circle
              cx={hoverX}
              cy={mainPoints[hoverIndex].y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
            {/* Overlay dots */}
            {overlays.map((overlay) => {
              const pts = toPoints(overlay.data);
              return (
                <circle
                  key={overlay.name}
                  cx={hoverX}
                  cy={pts[hoverIndex].y}
                  r="3.5"
                  fill={overlay.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              );
            })}
          </>
        )}

        {/* X-axis date labels */}
        {labels &&
          labels.map((label, i) => {
            const step = Math.max(1, Math.floor(labels.length / 6));
            if (i !== 0 && i !== labels.length - 1 && i % step !== 0) return null;
            const x =
              data.length === 1
                ? width / 2
                : (i / (data.length - 1)) * width;
            return (
              <text
                key={i}
                x={x}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                fillOpacity="0.4"
              >
                {label}
              </text>
            );
          })}
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10"
          style={{
            left: `${((hoverX / width) * 100).toFixed(1)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              {rawDates?.[hoverIndex]
                ? formatDate(rawDates[hoverIndex])
                : labels?.[hoverIndex] ?? ""}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              Total: <span className="font-semibold" style={{ color }}>{data[hoverIndex]}</span>
            </p>
            {overlays.map((overlay) => (
              <p key={overlay.name} className="text-zinc-500 dark:text-zinc-400">
                {overlay.name}:{" "}
                <span className="font-semibold" style={{ color: overlay.color }}>
                  {overlay.data[hoverIndex]}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const gradId = useId();
  const w = 120;
  const h = 40;
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: data.length === 1 ? w / 2 : (i / (data.length - 1)) * w,
    y: h - 2 - (v / max) * (h - 6),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- Main Panel ----------

// ---------- Spike Detection ----------

interface SpikeInfo {
  date: string;
  value: number;
  average: number;
  multiplier: number;
  topBrands: { name: string; count: number }[];
  topTopics: { name: string; count: number }[];
}

function detectSpikes(data: TrendData): SpikeInfo[] {
  const daily = data.dailyMentions;
  if (daily.length < 3) return [];

  const values = daily.map((d) => d.total);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return [];

  // A spike is any day > 2x the average
  const spikes: SpikeInfo[] = [];
  for (let i = 0; i < daily.length; i++) {
    const d = daily[i];
    if (d.total > avg * 2 && d.total >= 5) {
      const topBrands = Object.entries(d.byBrand)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
      const topTopics = Object.entries(d.byTopic)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
      spikes.push({
        date: d.date,
        value: d.total,
        average: Math.round(avg),
        multiplier: Math.round((d.total / avg) * 10) / 10,
        topBrands,
        topTopics,
      });
    }
  }

  // Return only the top 2 spikes
  return spikes.sort((a, b) => b.value - a.value).slice(0, 2);
}

export function TrendPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>("30");
  const [data, setData] = useState<TrendData | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBrands, setActiveBrands] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const narrativeRequested = useRef(false);

  async function fetchTrends(refresh = false) {
    setLoading(true);
    setError(null);
    setNarrative(null);
    narrativeRequested.current = false;
    try {
      const res = await fetch(
        `/api/trends?clientId=${clientId}&period=${period}&refresh=${refresh}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load trends");
      setData(json.data);
      setCachedAt(json.cachedAt);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // Fetch AI narrative when spikes are detected
  useEffect(() => {
    if (!data || narrativeRequested.current) return;
    const spikes = detectSpikes(data);
    if (spikes.length === 0) return;

    narrativeRequested.current = true;
    setNarrativeLoading(true);

    const spikeDescriptions = spikes
      .map(
        (s) =>
          `${formatDate(s.date)}: ${s.value} mentions (${s.multiplier}x the ${s.average}/day average). Top brands: ${s.topBrands.map((b) => `${b.name} (${b.count})`).join(", ") || "none"}. Top topics: ${s.topTopics.map((t) => `${t.name} (${t.count})`).join(", ") || "none"}.`
      )
      .join(" ");

    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        message: `Analyse these mention spikes for ${data.clientName} and explain what likely drove them in 2-3 concise sentences. Use third person. Be specific about the brands and topics. Spikes: ${spikeDescriptions}`,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.response) setNarrative(json.response);
      })
      .catch(() => {})
      .finally(() => setNarrativeLoading(false));
  }, [data, clientId]);

  useEffect(() => {
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, clientId]);

  // Clear selections when data changes
  useEffect(() => {
    setActiveBrands(new Set());
    setSelectedTopics(new Set());
  }, [data]);

  // Toggle a brand overlay on the chart
  function toggleBrand(brand: string) {
    setActiveBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }

  // Toggle topic selection
  function toggleTopic(topic: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  }

  // Derived data
  const dailyTotals = data?.dailyMentions.map((d) => d.total) ?? [];
  const dateLabels = data?.dailyMentions.map((d) => formatDate(d.date)) ?? [];
  const rawDates = data?.dailyMentions.map((d) => d.date) ?? [];
  const totalMentions = dailyTotals.reduce((a, b) => a + b, 0);
  const hasAnyData = totalMentions > 0;

  // Compute brand totals for filtering
  const brandTotals: Record<string, { data: number[]; total: number }> = {};
  for (const brand of data?.brands ?? []) {
    const brandData = data!.dailyMentions.map((d) => d.byBrand[brand] ?? 0);
    brandTotals[brand] = {
      data: brandData,
      total: brandData.reduce((a, b) => a + b, 0),
    };
  }
  const visibleBrands = (data?.brands ?? []).filter(
    (b) => brandTotals[b].total > 0
  );

  // Compute topic totals for filtering
  const topicTotals: Record<string, { data: number[]; total: number }> = {};
  for (const topic of data?.topics ?? []) {
    const topicData = data!.dailyMentions.map((d) => d.byTopic[topic] ?? 0);
    topicTotals[topic] = {
      data: topicData,
      total: topicData.reduce((a, b) => a + b, 0),
    };
  }
  const visibleTopics = (data?.topics ?? []).filter(
    (t) => topicTotals[t].total > 0
  );

  // Build overlay data for active brands
  const overlays = visibleBrands
    .filter((b) => activeBrands.has(b))
    .map((brand, idx) => ({
      name: brand,
      data: brandTotals[brand].data,
      color: BRAND_COLORS[visibleBrands.indexOf(brand) % BRAND_COLORS.length],
    }));

  return (
    <div className="rounded-lg border-t-4 border-violet-500 bg-white p-6 shadow-sm dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Mention Trends
          </h2>
          {data && hasAnyData && (
            <p className="mt-0.5 text-sm text-zinc-500">
              {totalMentions} total mentions over {data.period} days
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  period === p.days
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchTrends(true)}
            disabled={loading}
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:hover:text-zinc-300"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Cached-at timestamp */}
      {cachedAt && !loading && (
        <p className="mb-4 text-xs text-zinc-400">
          Last refreshed {timeAgo(cachedAt)}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mb-4 text-sm text-red-500">{error}</p>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
          Loading trend data...
        </div>
      )}

      {/* Empty state — no data at all */}
      {data && !hasAnyData && (
        <div className="flex h-52 flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 dark:border-zinc-700">
          <svg className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No mention data available
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Run a backfill to populate historical data.
          </p>
        </div>
      )}

      {/* Main area chart */}
      {data && hasAnyData && (
        <>
          {/* Active brand legend */}
          {overlays.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "#8b5cf6" }} />
                Total
              </span>
              {overlays.map((o) => (
                <span key={o.name} className="flex items-center gap-1.5 text-zinc-400">
                  <span
                    className="inline-block h-0.5 w-4 rounded"
                    style={{ backgroundColor: o.color, borderStyle: "dashed" }}
                  />
                  {o.name}
                </span>
              ))}
            </div>
          )}

          <div className="h-52 w-full pl-6">
            <InteractiveAreaChart
              data={dailyTotals}
              overlays={overlays}
              width={800}
              height={220}
              color="#8b5cf6"
              labels={dateLabels}
              rawDates={rawDates}
            />
          </div>

          {/* Spike narrative */}
          {(narrative || narrativeLoading) && (
            <div className="mt-4 rounded-md border border-violet-100 bg-violet-50/50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                {narrativeLoading ? (
                  <p className="text-xs text-violet-400 animate-pulse">Analysing spike activity...</p>
                ) : (
                  <p className="text-xs leading-relaxed text-violet-700 dark:text-violet-300">{narrative}</p>
                )}
              </div>
            </div>
          )}

          {/* Brand cards — only show section if any brands have mentions */}
          {visibleBrands.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                By Brand
                <span className="ml-2 font-normal normal-case text-zinc-300 dark:text-zinc-600">
                  — click to overlay on chart
                </span>
              </h3>
              <div className="flex flex-wrap gap-4">
                {visibleBrands.map((brand, idx) => {
                  const info = brandTotals[brand];
                  const isActive = activeBrands.has(brand);
                  const brandColor =
                    BRAND_COLORS[idx % BRAND_COLORS.length];

                  return (
                    <button
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className={`flex flex-col items-center rounded-md border px-3 py-2 transition-all ${
                        isActive
                          ? "border-2 shadow-sm"
                          : "border-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600"
                      }`}
                      style={
                        isActive
                          ? { borderColor: brandColor }
                          : undefined
                      }
                    >
                      <Sparkline
                        data={info.data}
                        color={isActive ? brandColor : "#71717a"}
                      />
                      <p
                        className={`mt-1 text-xs font-medium ${
                          isActive
                            ? ""
                            : "text-zinc-500"
                        }`}
                        style={isActive ? { color: brandColor } : undefined}
                      >
                        {brand}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {info.total} mentions
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topic cards — only show section if any topics have mentions */}
          {visibleTopics.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                By Topic
                <span className="ml-2 font-normal normal-case text-zinc-300 dark:text-zinc-600">
                  — click to select
                </span>
              </h3>
              <div className="flex flex-wrap gap-4">
                {visibleTopics.map((topic) => {
                  const info = topicTotals[topic];
                  const isSelected = selectedTopics.has(topic);

                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={`flex flex-col items-center rounded-md border px-3 py-2 transition-all ${
                        isSelected
                          ? "border-2 border-violet-400 shadow-sm dark:border-violet-500"
                          : "border-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600"
                      }`}
                    >
                      <Sparkline
                        data={info.data}
                        color={isSelected ? "#8b5cf6" : "#71717a"}
                      />
                      <p
                        className={`mt-1 text-xs font-medium ${
                          isSelected
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {topic}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {info.total} mentions
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
