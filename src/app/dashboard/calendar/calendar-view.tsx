"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Event types                                                        */
/* ------------------------------------------------------------------ */

type EventCategory =
  | "regulatory"
  | "media"
  | "industry"
  | "internal"
  | "opportunity";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: EventCategory;
  description: string;
}

const CATEGORY_META: Record<
  EventCategory,
  { label: string; dot: string; pill: string; border: string }
> = {
  regulatory: {
    label: "Regulatory",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
  media: {
    label: "Media",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  industry: {
    label: "Industry",
    dot: "bg-green-500",
    pill: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  internal: {
    label: "Internal",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  opportunity: {
    label: "Opportunity",
    dot: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
};

/* ------------------------------------------------------------------ */
/*  Simulated events                                                   */
/* ------------------------------------------------------------------ */

const EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Ofwat Q4 Performance Review deadline",
    date: "2026-03-16",
    category: "regulatory",
    description:
      "Deadline for submitting Q4 2025/26 performance data to Ofwat. Castle Water must ensure all KPIs and customer satisfaction metrics are filed.",
  },
  {
    id: "2",
    title: "Weekly brief due",
    date: "2026-03-13",
    category: "internal",
    description:
      "Weekly media intelligence brief for Castle Water comms team covering the past seven days of coverage and upcoming risks.",
  },
  {
    id: "3",
    title: "Castle Water Q3 Results Embargo Lifts",
    date: "2026-03-17",
    category: "media",
    description:
      "Embargo lifts at 07:00 GMT on Castle Water Q3 financial results. Coordinate with IR team on spokesperson availability.",
  },
  {
    id: "4",
    title: "CMA Price Review Update published",
    date: "2026-03-19",
    category: "regulatory",
    description:
      "Competition and Markets Authority publishes interim findings on water retail market pricing. Potential impact on Castle Water positioning.",
  },
  {
    id: "5",
    title: "Journalist briefing — FT utilities reporter",
    date: "2026-03-20",
    category: "media",
    description:
      "Background briefing with Financial Times utilities correspondent on Castle Water's smart metering rollout and customer service improvements.",
  },
  {
    id: "6",
    title: "Weekly brief due",
    date: "2026-03-20",
    category: "internal",
    description:
      "Weekly media intelligence brief for Castle Water comms team.",
  },
  {
    id: "7",
    title: "Pitch deadline: Smart Metering feature — Utility Week",
    date: "2026-03-23",
    category: "internal",
    description:
      "Final copy due for Utility Week feature on Castle Water's smart metering programme. 1,200 words plus spokesperson quotes.",
  },
  {
    id: "8",
    title: "Water UK Annual Conference",
    date: "2026-03-25",
    category: "industry",
    description:
      "Two-day conference in London. Key sessions on retail market competition, sustainability targets, and innovation. Networking opportunity with regulators.",
  },
  {
    id: "9",
    title: "Water UK Annual Conference — Day 2",
    date: "2026-03-26",
    category: "industry",
    description:
      "Second day focused on customer experience and digital transformation in water retail.",
  },
  {
    id: "10",
    title: "Weekly brief due",
    date: "2026-03-27",
    category: "internal",
    description:
      "Weekly media intelligence brief for Castle Water comms team.",
  },
  {
    id: "11",
    title: "Speaking slot: Water Retail Market Conference",
    date: "2026-03-30",
    category: "opportunity",
    description:
      "Confirmed 20-minute speaking slot on 'Customer-first innovation in water retail'. CEO John Reynolds presenting. Prep briefing pack by March 27.",
  },
  {
    id: "12",
    title: "Scottish Water Innovation Summit",
    date: "2026-04-02",
    category: "industry",
    description:
      "Edinburgh-based summit on innovation in Scottish water sector. Castle Water represented on panel discussion about retail competition north of the border.",
  },
  {
    id: "13",
    title: "Weekly brief due",
    date: "2026-04-03",
    category: "internal",
    description:
      "Weekly media intelligence brief for Castle Water comms team.",
  },
  {
    id: "14",
    title: "Panel invitation: BBC Scotland water debate",
    date: "2026-04-07",
    category: "opportunity",
    description:
      "Invitation to appear on BBC Scotland segment debating water retail market reform. High-visibility opportunity for Castle Water spokesperson.",
  },
  {
    id: "15",
    title: "MOSL Market Performance Report publication",
    date: "2026-04-09",
    category: "regulatory",
    description:
      "Market Operator Services Ltd publishes quarterly market performance data. Castle Water ranking likely to be covered by trade press.",
  },
  {
    id: "16",
    title: "Sustainability in Water Management Awards — entry deadline",
    date: "2026-04-14",
    category: "industry",
    description:
      "Final deadline for submitting Castle Water entries to the SiWM Awards. Categories: Best Customer Initiative, Innovation in Metering.",
  },
  {
    id: "17",
    title: "Press conference: H1 trading update",
    date: "2026-04-16",
    category: "media",
    description:
      "Castle Water H1 2026 trading update press conference. Venue TBC. Media pack and Q&A brief to be prepared by April 13.",
  },
  {
    id: "18",
    title: "Weekly brief due",
    date: "2026-04-10",
    category: "internal",
    description:
      "Weekly media intelligence brief for Castle Water comms team.",
  },
  {
    id: "19",
    title: "Op-ed placement: The Herald — water market competition",
    date: "2026-04-20",
    category: "opportunity",
    description:
      "Confirmed placement for Castle Water CEO op-ed in The Herald on the benefits of water market competition for Scottish businesses.",
  },
  {
    id: "20",
    title: "Ofwat Annual Review of Non-household Market draft",
    date: "2026-04-23",
    category: "regulatory",
    description:
      "Draft version of Ofwat annual review circulated to market participants. Response window opens — coordinate with policy team.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfMonth(year: number, month: number) {
  // 0 = Sunday … 6 = Saturday  →  shift to Mon-start: 0 = Mon … 6 = Sun
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarView({ clientName }: { clientName: string }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build lookup: dateKey → events[]
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of EVENTS) {
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, []);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = startDayOfMonth(viewYear, viewMonth);

  // Navigation
  function goPrev() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
  }
  function goNext() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(null);
  }

  const todayKey = dateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Demo banner */}
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
        Simulated planning data — for demonstration purposes
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {(Object.entries(CATEGORY_META) as [EventCategory, (typeof CATEGORY_META)[EventCategory]][]).map(
          ([key, meta]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`}
              />
              {meta.label}
            </span>
          ),
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Today
          </button>
          <button
            onClick={goPrev}
            aria-label="Previous month"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={goNext}
            aria-label="Next month"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty offset cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[5.5rem] border-b border-r border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/30"
            />
          ))}

          {/* Day cells */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const key = dateKey(viewYear, viewMonth, day);
            const dayEvents = eventsByDate[key] ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;

            return (
              <button
                key={key}
                onClick={() =>
                  setSelectedDate(isSelected ? null : key)
                }
                className={`relative min-h-[5.5rem] border-b border-r p-1.5 text-left transition-colors ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                } border-zinc-100 dark:border-zinc-800`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {day}
                </span>

                {/* Event dots / pills */}
                {dayEvents.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium ${CATEGORY_META[ev.category].pill}`}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-zinc-400">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {formatDisplayDate(selectedDate)}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No events scheduled for this date.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((ev) => {
                const meta = CATEGORY_META[ev.category];
                return (
                  <div
                    key={ev.id}
                    className={`rounded-lg border p-3 ${meta.border}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`}
                      />
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {ev.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {ev.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline icons (no external deps)                                    */
/* ------------------------------------------------------------------ */

function ChevronLeft() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
