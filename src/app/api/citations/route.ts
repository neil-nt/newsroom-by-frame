import { NextRequest, NextResponse } from "next/server";
import { runCitationAnalysis, runCustomQuery } from "@/lib/intelligence/llm-citations";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/citations?clientId=xxx
 * Returns the cached citation report if one exists.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
  }

  const cached = await prisma.cachedReport.findUnique({
    where: { clientId_type: { clientId, type: "citations" } },
  });

  if (!cached) {
    return NextResponse.json({ success: true, report: null, cachedAt: null });
  }

  return NextResponse.json({
    success: true,
    report: JSON.parse(cached.data),
    cachedAt: cached.createdAt,
  });
}

/**
 * POST /api/citations
 * Body: { clientId, customQuery?, customCategory? }
 *
 * If customQuery is provided, runs that single query and returns the result
 * (does not replace the cached full report).
 *
 * Otherwise, runs full citation analysis and caches the result.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, customQuery, customCategory } = body as {
      clientId?: string;
      customQuery?: string;
      customCategory?: string;
    };

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    // --- Custom single-query mode ---
    if (customQuery) {
      const category = customCategory || "Custom";
      const result = await runCustomQuery(clientId, customQuery, category);
      return NextResponse.json({
        success: true,
        citation: result.citation,
        clientName: result.clientName,
      });
    }

    // --- Full analysis mode ---
    // Load previous results for trend tracking
    let previousCitations: { query: string; brandMentioned: boolean }[] | undefined;
    try {
      const cached = await prisma.cachedReport.findUnique({
        where: { clientId_type: { clientId, type: "citations" } },
      });
      if (cached) {
        const prevReport = JSON.parse(cached.data);
        if (prevReport.previousCitations) {
          previousCitations = prevReport.previousCitations;
        } else if (prevReport.citations) {
          // Backwards compatibility: derive from old report format
          previousCitations = prevReport.citations.map((c: { query: string; brandMentioned: boolean }) => ({
            query: c.query,
            brandMentioned: c.brandMentioned,
          }));
        }
      }
    } catch {
      // If we can't load previous, that's fine — trends will show as "new"
    }

    const report = await runCitationAnalysis(clientId, previousCitations);

    // Cache the result
    await prisma.cachedReport.upsert({
      where: { clientId_type: { clientId, type: "citations" } },
      create: { clientId, type: "citations", data: JSON.stringify(report) },
      update: { data: JSON.stringify(report), createdAt: new Date() },
    });

    return NextResponse.json({ success: true, report, cachedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Citation analysis error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
