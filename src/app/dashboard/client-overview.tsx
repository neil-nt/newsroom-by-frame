"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  summary: string;
  sourcesCount: number;
  alertsCount: number;
  recentAlertCount: number;
  rawItemsCount: number;
  competitorsCount: number;
  topicsCount: number;
  lastActivity: string | null;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ClientOverview() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients?overview=true")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch clients");
        return res.json();
      })
      .then((data: ClientSummary[]) => {
        setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Error loading clients: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            All Clients
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/onboard"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Add New Client
        </Link>
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <p className="text-zinc-500">No clients yet.</p>
          <Link
            href="/dashboard/onboard"
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Onboard your first client
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard?client=${client.id}`}
              className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left side: name, badge, summary */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                      {client.name}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        client.active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {client.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {client.summary && (
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {client.summary}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {client.sourcesCount}
                      </span>{" "}
                      sources
                    </span>
                    <span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {client.recentAlertCount}
                      </span>{" "}
                      alerts (7d)
                    </span>
                    <span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {client.rawItemsCount.toLocaleString()}
                      </span>{" "}
                      raw items
                    </span>
                    <span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {client.competitorsCount}
                      </span>{" "}
                      competitors tracked
                    </span>
                    <span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {client.topicsCount}
                      </span>{" "}
                      topics monitored
                    </span>
                  </div>
                </div>

                {/* Right side: last activity + CTA */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {client.lastActivity && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      Last activity{" "}
                      {formatRelativeTime(client.lastActivity)}
                    </span>
                  )}
                  <span className="mt-auto text-sm font-medium text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                    View Dashboard &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
