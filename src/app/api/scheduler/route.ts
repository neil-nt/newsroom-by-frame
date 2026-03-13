import { NextRequest, NextResponse } from "next/server";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerJob,
  startJob,
  stopJob,
} from "@/lib/scheduler";

/**
 * Lazy-init: start the scheduler on first request.
 */
function ensureStarted() {
  const status = getSchedulerStatus();
  if (!status.initialized) {
    startScheduler();
  }
}

/**
 * GET /api/scheduler
 * Returns current scheduler status.
 */
export async function GET() {
  ensureStarted();
  const status = getSchedulerStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/scheduler
 * Control the scheduler.
 * Body: { action: "start" | "stop" | "trigger", job?: "ingestion" | "backfill" }
 */
export async function POST(request: NextRequest) {
  ensureStarted();

  try {
    const body = await request.json();
    const { action, job } = body as {
      action: "start" | "stop" | "trigger";
      job?: "ingestion" | "backfill";
    };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "start": {
        if (job) {
          const ok = startJob(job);
          if (!ok) {
            return NextResponse.json(
              { success: false, error: `Unknown job: ${job}` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: `Job "${job}" started`,
          });
        }
        startScheduler();
        return NextResponse.json({
          success: true,
          message: "Scheduler started",
        });
      }

      case "stop": {
        if (job) {
          const ok = stopJob(job);
          if (!ok) {
            return NextResponse.json(
              { success: false, error: `Unknown job: ${job}` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: `Job "${job}" stopped`,
          });
        }
        stopScheduler();
        return NextResponse.json({
          success: true,
          message: "Scheduler stopped",
        });
      }

      case "trigger": {
        if (!job) {
          return NextResponse.json(
            { success: false, error: "job is required for trigger action" },
            { status: 400 }
          );
        }
        const ok = await triggerJob(job);
        if (!ok) {
          return NextResponse.json(
            { success: false, error: `Unknown or uninitialized job: ${job}` },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Job "${job}" triggered`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Scheduler API error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
