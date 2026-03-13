import { NextRequest, NextResponse } from "next/server";
import { detectWhiteSpace } from "@/lib/intelligence/whitespace";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/whitespace?clientId=xxx
 * Retrieves the most recent white space run for a client.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { success: false, error: "clientId is required" },
      { status: 400 }
    );
  }

  const latestRun = await prisma.whiteSpaceRun.findFirst({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { opportunities: { orderBy: { score: "desc" } } },
  });

  if (!latestRun) {
    return NextResponse.json({
      success: true,
      opportunities: [],
      metadata: null,
      run: null,
    });
  }

  // Parse JSON fields back
  const opportunities = latestRun.opportunities.map((opp) => ({
    ...opp,
    evidenceSources: JSON.parse(opp.evidenceSources),
    actionSteps: JSON.parse(opp.actionSteps),
    pitchTo: JSON.parse(opp.pitchTo),
    relevantDataPoints: JSON.parse(opp.relevantDataPoints),
  }));

  return NextResponse.json({
    success: true,
    opportunities,
    metadata: JSON.parse(latestRun.metadata),
    run: { id: latestRun.id, createdAt: latestRun.createdAt },
  });
}

/**
 * POST /api/whitespace
 * Runs the White Space Radar to identify proactive media opportunities.
 * Body: { clientId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId } = body as { clientId?: string };

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    const result = await detectWhiteSpace(clientId);

    // Persist the run and opportunities to the database
    const run = await prisma.whiteSpaceRun.create({
      data: {
        clientId,
        metadata: JSON.stringify(result.metadata),
        opportunities: {
          create: result.opportunities.map((opp) => ({
            topic: opp.topic,
            opportunity: opp.opportunity,
            suggestedHeadline: opp.suggestedHeadline,
            score: opp.score,
            timing: opp.timing,
            triggerType: opp.triggerType,
            theGap: opp.theGap,
            yourAdvantage: opp.yourAdvantage,
            theWindow: opp.theWindow,
            evidenceSources: JSON.stringify(opp.evidenceSources),
            calendarEvent: opp.calendarEvent,
            calendarDate: opp.calendarDate,
            competitorSilence: opp.competitorSilence,
            actionSteps: JSON.stringify(opp.actionSteps),
            pitchAngle: opp.pitchAngle,
            spokespersonBrief: opp.spokespersonBrief,
            spokesperson: opp.spokesperson,
            pitchTo: JSON.stringify(opp.pitchTo),
            relevantDataPoints: JSON.stringify(opp.relevantDataPoints),
          })),
        },
      },
      include: { opportunities: true },
    });

    return NextResponse.json({
      success: true,
      opportunities: result.opportunities,
      metadata: result.metadata,
      run: { id: run.id, createdAt: run.createdAt },
    });
  } catch (error) {
    console.error("White space radar error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/whitespace
 * Updates the status of a white space opportunity.
 * Body: { id: string, status: string, statusNote?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, statusNote } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "id and status are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.whiteSpaceOpp.update({
      where: { id },
      data: {
        status,
        statusNote: statusNote || null,
        statusDate: new Date(),
      },
    });

    return NextResponse.json({ success: true, opportunity: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
