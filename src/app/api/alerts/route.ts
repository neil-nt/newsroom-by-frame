import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/alerts?clientId=xxx&type=breaking&status=new&limit=20&search=&urgency=&dateFrom=&dateTo=
 * Fetch alerts with filtering.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search");
  const urgency = searchParams.get("urgency");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  // Build where clause
  const where: any = { clientId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { summary: { contains: search } },
    ];
  }

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Parse JSON fields for the response
  const parsed = alerts.map((alert) => ({
    ...alert,
    targetMedia: alert.targetMedia ? JSON.parse(alert.targetMedia) : [],
    dataPoints: alert.dataPoints ? JSON.parse(alert.dataPoints) : [],
  }));

  return NextResponse.json(parsed);
}

/**
 * PATCH /api/alerts
 * Update alert status/feedback/outcome.
 * Body: { id, status?, feedback?, feedbackNote?, outcome?, outcomeNote?, coverageUrl? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, feedback, feedbackNote, outcome, outcomeNote, coverageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (feedback) data.feedback = feedback;
    if (feedbackNote) data.feedbackNote = feedbackNote;
    if (outcome !== undefined) {
      data.outcome = outcome;
      data.outcomeNote = outcomeNote || null;
      data.outcomeDate = new Date();
      if (coverageUrl) data.coverageUrl = coverageUrl;
    }

    const updated = await prisma.alert.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
