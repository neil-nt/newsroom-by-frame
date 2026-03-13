import { NextRequest, NextResponse } from "next/server";
import { calculateShareOfVoice } from "@/lib/intelligence/share-of-voice";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/share-of-voice?clientId=xxx&period=30&refresh=true
 * Returns cached SOV data, or calculates fresh if refresh=true or no cache.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const period = request.nextUrl.searchParams.get("period") || "30";
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    const cacheKey = `sov_${period}d`;

    // Try cached first (unless refresh requested)
    if (!refresh) {
      const cached = await prisma.cachedReport.findUnique({
        where: { clientId_type: { clientId, type: cacheKey } },
      });

      if (cached) {
        return NextResponse.json({
          success: true,
          data: JSON.parse(cached.data),
          cachedAt: cached.createdAt,
        });
      }
    }

    // Calculate fresh
    const data = await calculateShareOfVoice(clientId, parseInt(period, 10));

    // Cache the result
    await prisma.cachedReport.upsert({
      where: { clientId_type: { clientId, type: cacheKey } },
      create: { clientId, type: cacheKey, data: JSON.stringify(data) },
      update: { data: JSON.stringify(data), createdAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Share of voice error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
