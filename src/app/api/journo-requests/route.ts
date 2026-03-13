import { NextRequest, NextResponse } from "next/server";
import { fetchJournoRequests } from "@/lib/ingestion/sources/journo-requests";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/journo-requests?clientId=xxx&refresh=true
 * Returns cached journalist requests, or fetches fresh if refresh=true or no cache.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    // Try cached first (unless refresh requested)
    if (!refresh) {
      const cached = await prisma.cachedReport.findUnique({
        where: { clientId_type: { clientId, type: "journo_requests" } },
      });

      if (cached) {
        const data = JSON.parse(cached.data);
        return NextResponse.json({
          success: true,
          requests: data.requests,
          count: data.requests.length,
          cachedAt: cached.createdAt,
        });
      }
    }

    // Fetch fresh data
    const requests = await fetchJournoRequests(clientId);

    // Cache the result
    await prisma.cachedReport.upsert({
      where: { clientId_type: { clientId, type: "journo_requests" } },
      create: { clientId, type: "journo_requests", data: JSON.stringify({ requests }) },
      update: { data: JSON.stringify({ requests }), createdAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("JournoRequest fetch error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
