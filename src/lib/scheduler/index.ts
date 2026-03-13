import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "@/lib/db/client";
import { runPipelineForAllClients } from "@/lib/ingestion/pipeline";
import { fetchGoogleNews } from "@/lib/ingestion/sources/google-news";
import { fetchNewsAPI } from "@/lib/ingestion/sources/news-api";
import { loadClientContext } from "@/lib/intelligence/context";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface JobState {
  name: string;
  cronExpression: string;
  description: string;
  lastRunAt: Date | null;
  lastRunDurationMs: number | null;
  lastRunError: string | null;
  running: boolean;
  task: ScheduledTask | null;
}

export interface SchedulerStatus {
  initialized: boolean;
  jobs: {
    name: string;
    cronExpression: string;
    description: string;
    lastRunAt: string | null;
    lastRunDurationMs: number | null;
    lastRunError: string | null;
    nextRunAt: string | null;
    running: boolean;
  }[];
}

/* ------------------------------------------------------------------ */
/*  State (module-level singleton)                                     */
/* ------------------------------------------------------------------ */

const jobs: Map<string, JobState> = new Map();
let initialized = false;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function log(job: string, message: string) {
  const ts = new Date().toISOString();
  console.log(`[scheduler][${job}] ${ts} ${message}`);
}

/**
 * Calculate the next run time for a cron expression.
 * node-cron doesn't expose this natively, so we do a simple estimation.
 */
function estimateNextRun(cronExpr: string): Date | null {
  try {
    // Use cron.getTasks or manual calculation
    // For common patterns, compute directly:
    const now = new Date();

    if (cronExpr === "0 * * * *") {
      // top of every hour
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next;
    }

    if (cronExpr === "0 6 * * *") {
      // 6am daily
      const next = new Date(now);
      next.setHours(6, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }

    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Job: Hourly Ingestion                                              */
/* ------------------------------------------------------------------ */

async function runIngestion() {
  const job = jobs.get("ingestion")!;
  if (job.running) {
    log("ingestion", "Skipped — previous run still in progress");
    return;
  }

  job.running = true;
  const start = Date.now();
  log("ingestion", "Starting hourly ingestion for all active clients");

  try {
    const results = await runPipelineForAllClients();
    const elapsed = Date.now() - start;
    job.lastRunAt = new Date();
    job.lastRunDurationMs = elapsed;
    job.lastRunError = null;
    log("ingestion", `Completed in ${elapsed}ms — ${JSON.stringify(results)}`);
  } catch (error) {
    const elapsed = Date.now() - start;
    job.lastRunAt = new Date();
    job.lastRunDurationMs = elapsed;
    job.lastRunError = String(error);
    log("ingestion", `Failed after ${elapsed}ms — ${error}`);
  } finally {
    job.running = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Job: Daily Backfill                                                */
/* ------------------------------------------------------------------ */

async function runBackfill() {
  const job = jobs.get("backfill")!;
  if (job.running) {
    log("backfill", "Skipped — previous run still in progress");
    return;
  }

  job.running = true;
  const start = Date.now();
  log("backfill", "Starting daily backfill for all active clients");

  try {
    const clients = await prisma.client.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    for (const client of clients) {
      log("backfill", `Processing client: ${client.name}`);

      const context = await loadClientContext(client.id);
      if (!context) {
        log("backfill", `No context for client ${client.name}, skipping`);
        continue;
      }

      const competitors = await prisma.competitor.findMany({
        where: { clientId: client.id },
      });

      // Get or create backfill source
      let backfillSource = await prisma.source.findFirst({
        where: { clientId: client.id, name: "Historical Backfill" },
      });
      if (!backfillSource) {
        backfillSource = await prisma.source.create({
          data: {
            clientId: client.id,
            name: "Historical Backfill",
            type: "backfill",
            category: "brand_monitoring",
            active: false,
          },
        });
      }

      // Build queries for client + competitors
      const queries = [
        { name: context.name, query: `"${context.name}"` },
        ...competitors.map((c) => ({ name: c.name, query: `"${c.name}"` })),
      ];

      let totalStored = 0;

      for (const q of queries) {
        try {
          const gnewsItems = await fetchGoogleNews(q.query);
          for (const item of gnewsItems) {
            if (!item.externalId) continue;
            try {
              await prisma.rawItem.upsert({
                where: {
                  sourceId_externalId: {
                    sourceId: backfillSource.id,
                    externalId: item.externalId,
                  },
                },
                create: {
                  sourceId: backfillSource.id,
                  externalId: item.externalId,
                  title: item.title,
                  content: item.content,
                  url: item.url,
                  author: item.author,
                  publishedAt: item.publishedAt,
                  rawData: item.rawData,
                  status: "backfill",
                },
                update: {},
              });
              totalStored++;
            } catch {
              /* skip duplicates */
            }
          }
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          log("backfill", `Google News fetch failed for "${q.name}": ${err}`);
        }

        // NewsAPI if available
        if (process.env.NEWS_API_KEY) {
          try {
            const newsItems = await fetchNewsAPI(q.query, {
              language: "en",
              sortBy: "publishedAt",
              pageSize: 50,
            });
            for (const item of newsItems) {
              if (!item.externalId) continue;
              try {
                await prisma.rawItem.upsert({
                  where: {
                    sourceId_externalId: {
                      sourceId: backfillSource.id,
                      externalId: item.externalId,
                    },
                  },
                  create: {
                    sourceId: backfillSource.id,
                    externalId: item.externalId,
                    title: item.title,
                    content: item.content,
                    url: item.url,
                    author: item.author,
                    publishedAt: item.publishedAt,
                    rawData: item.rawData,
                    status: "backfill",
                  },
                  update: {},
                });
                totalStored++;
              } catch {
                /* skip duplicates */
              }
            }
            await new Promise((r) => setTimeout(r, 500));
          } catch (err) {
            log("backfill", `NewsAPI fetch failed for "${q.name}": ${err}`);
          }
        }
      }

      // Update backfill source timestamp
      await prisma.source.update({
        where: { id: backfillSource.id },
        data: { lastFetchedAt: new Date() },
      });

      log("backfill", `Client ${client.name}: stored ${totalStored} items`);
    }

    const elapsed = Date.now() - start;
    job.lastRunAt = new Date();
    job.lastRunDurationMs = elapsed;
    job.lastRunError = null;
    log("backfill", `Completed in ${elapsed}ms`);
  } catch (error) {
    const elapsed = Date.now() - start;
    job.lastRunAt = new Date();
    job.lastRunDurationMs = elapsed;
    job.lastRunError = String(error);
    log("backfill", `Failed after ${elapsed}ms — ${error}`);
  } finally {
    job.running = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function startScheduler(): void {
  if (initialized) return;

  // Hourly ingestion — top of every hour
  const ingestionTask = cron.schedule("0 * * * *", () => {
    void runIngestion();
  });

  jobs.set("ingestion", {
    name: "ingestion",
    cronExpression: "0 * * * *",
    description: "Hourly ingestion for all active clients",
    lastRunAt: null,
    lastRunDurationMs: null,
    lastRunError: null,
    running: false,
    task: ingestionTask,
  });

  // Daily backfill — 6am every day
  const backfillTask = cron.schedule("0 6 * * *", () => {
    void runBackfill();
  });

  jobs.set("backfill", {
    name: "backfill",
    cronExpression: "0 6 * * *",
    description: "Daily historical backfill at 6am",
    lastRunAt: null,
    lastRunDurationMs: null,
    lastRunError: null,
    running: false,
    task: backfillTask,
  });

  initialized = true;
  log("scheduler", "Scheduler started with 2 jobs");
}

export function stopScheduler(): void {
  for (const [, job] of jobs) {
    job.task?.stop();
  }
  initialized = false;
  log("scheduler", "Scheduler stopped");
}

export function stopJob(jobName: string): boolean {
  const job = jobs.get(jobName);
  if (!job || !job.task) return false;
  job.task.stop();
  log(jobName, "Job stopped");
  return true;
}

export function startJob(jobName: string): boolean {
  const job = jobs.get(jobName);
  if (!job || !job.task) return false;
  job.task.start();
  log(jobName, "Job started");
  return true;
}

export async function triggerJob(jobName: string): Promise<boolean> {
  if (jobName === "ingestion") {
    // Ensure the job state exists even if scheduler not fully started
    if (!jobs.has("ingestion")) return false;
    void runIngestion();
    return true;
  }
  if (jobName === "backfill") {
    if (!jobs.has("backfill")) return false;
    void runBackfill();
    return true;
  }
  return false;
}

export function getSchedulerStatus(): SchedulerStatus {
  const jobList = Array.from(jobs.values()).map((job) => ({
    name: job.name,
    cronExpression: job.cronExpression,
    description: job.description,
    lastRunAt: job.lastRunAt?.toISOString() ?? null,
    lastRunDurationMs: job.lastRunDurationMs,
    lastRunError: job.lastRunError,
    nextRunAt: estimateNextRun(job.cronExpression)?.toISOString() ?? null,
    running: job.running,
  }));

  return { initialized, jobs: jobList };
}
