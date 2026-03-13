"use client";

import { useState, useEffect } from "react";

interface JournoRequest {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author: string;
  publishedAt: string;
  journalist: string;
  outlet: string | null;
  deadline: string | null;
  matchedTopics: string[];
  relevanceScore: number;
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

export function JournoPanel({ clientId, embedded = false }: { clientId: string; embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<JournoRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Auto-fetch cached data on mount
  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await fetch(
          `/api/journo-requests?clientId=${clientId}`
        );
        const data = await res.json();
        if (data.success) {
          setRequests(data.requests);
          if (data.cachedAt) setLastFetched(data.cachedAt);
        }
      } catch {
        /* ignore — user can still scan manually */
      }
    }
    loadRequests();
  }, [clientId]);

  async function scanNow() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/journo-requests?clientId=${clientId}&refresh=true`
      );
      const data = await res.json();

      if (data.success) {
        setRequests(data.requests);
        setLastFetched(data.cachedAt || new Date().toISOString());
      } else {
        setError(data.error || "Failed to fetch journalist requests");
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
            Journalist Requests
          </h2>
          <p className="text-xs text-zinc-500">
            Live #journorequest opportunities matched to client topics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-zinc-400">
              Last refreshed: {timeAgo(lastFetched)}
            </span>
          )}
          <button
            onClick={scanNow}
            disabled={loading}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Scanning..." : requests ? "Refresh" : "Scan Now"}
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
          <p className="animate-pulse text-sm text-zinc-500">
            Scanning #journorequest...
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Matching journalist requests to client topics
          </p>
        </div>
      )}

      {requests && !loading && (
        <>
          {requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              No relevant journalist requests found. Check back later.
            </p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.externalId}
                  className="rounded-md border border-zinc-100 p-3 transition-colors hover:border-pink-200 hover:bg-pink-50/30 dark:border-zinc-800 dark:hover:border-pink-800 dark:hover:bg-pink-950/20"
                >
                  {/* Header: journalist + outlet + time */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {req.journalist}
                    </span>
                    {req.outlet && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {req.outlet}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400">
                      {timeAgo(req.publishedAt)}
                    </span>
                    <span className="ml-auto text-[10px] text-zinc-400">
                      {Math.round(req.relevanceScore * 100)}% match
                    </span>
                  </div>

                  {/* Tweet text */}
                  <p className="mb-2 text-xs leading-relaxed text-zinc-600 line-clamp-3 dark:text-zinc-400">
                    {req.content}
                  </p>

                  {/* Footer: topics, deadline, CTA */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {req.matchedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400"
                      >
                        {topic}
                      </span>
                    ))}

                    {req.deadline && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Deadline: {req.deadline}
                      </span>
                    )}

                    <a
                      href={req.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto rounded bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-700 transition-colors hover:bg-pink-100 dark:bg-pink-950 dark:text-pink-400 dark:hover:bg-pink-900"
                    >
                      Respond on X &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!requests && !loading && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Click &quot;Scan Now&quot; to find journalist requests matched to the
          client&apos;s topics.
        </p>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-lg border-t-4 border-pink-500 bg-white p-6 shadow-sm dark:bg-zinc-900">
      {content}
    </div>
  );
}
