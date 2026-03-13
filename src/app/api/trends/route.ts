import { NextRequest, NextResponse } from "next/server";
import { aggregateTrends } from "@/lib/intelligence/trend-aggregation";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const period = request.nextUrl.searchParams.get("period") || "30";
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId required" },
        { status: 400 }
      );
    }

    const cacheKey = `trends_${period}d`;

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

    const data = await aggregateTrends(clientId, parseInt(period, 10));

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
    console.error("Trends error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
