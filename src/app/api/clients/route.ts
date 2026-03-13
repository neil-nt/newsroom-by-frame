import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/clients
 * List all clients with summary stats for the overview page.
 *
 * ?overview=true returns enriched data (counts, positioning, last activity).
 * Without it, returns the lightweight list (backwards-compatible).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const overview = searchParams.get("overview") === "true";

  if (!overview) {
    // Lightweight list for client switcher etc.
    const clients = await prisma.client.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            alerts: true,
            sources: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  }

  // Enriched list for the overview page
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      context: {
        select: { positioning: true },
      },
      _count: {
        select: {
          alerts: true,
          sources: true,
          competitors: true,
          topics: true,
        },
      },
    },
  });

  // For each client, get recent alert count and last activity
  const enriched = await Promise.all(
    clients.map(async (client) => {
      const [recentAlertCount, lastAlert, rawItemCount] = await Promise.all([
        prisma.alert.count({
          where: {
            clientId: client.id,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.alert.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.source.findMany({
          where: { clientId: client.id },
          include: { _count: { select: { rawItems: true } } },
        }),
      ]);

      const totalRawItems = rawItemCount.reduce(
        (sum, s) => sum + s._count.rawItems,
        0
      );

      const positioning = client.context?.positioning ?? "";
      const summary =
        positioning.length > 150
          ? positioning.slice(0, 150) + "..."
          : positioning;

      return {
        id: client.id,
        name: client.name,
        slug: client.slug,
        active: client.active,
        createdAt: client.createdAt,
        summary,
        sourcesCount: client._count.sources,
        alertsCount: client._count.alerts,
        recentAlertCount,
        rawItemsCount: totalRawItems,
        competitorsCount: client._count.competitors,
        topicsCount: client._count.topics,
        lastActivity: lastAlert?.createdAt ?? null,
      };
    })
  );

  return NextResponse.json(enriched);
}
