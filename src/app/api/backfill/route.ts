import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { fetchGoogleNews } from "@/lib/ingestion/sources/google-news";
import { fetchNewsAPI } from "@/lib/ingestion/sources/news-api";
import { loadClientContext } from "@/lib/intelligence/context";

interface BrandQuery {
  brandName: string;
  query: string;
  type: "client" | "competitor";
}

interface BrandStats {
  brandName: string;
  type: "client" | "competitor";
  fetched: number;
  stored: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId } = body as { clientId?: string };

    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId required" }, { status: 400 });
    }

    const context = await loadClientContext(clientId);
    if (!context) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    // Load competitors directly from the DB for full records
    const competitors = await prisma.competitor.findMany({
      where: { clientId },
    });

    // Get or create a "backfill" source for this client
    let backfillSource = await prisma.source.findFirst({
      where: { clientId, name: "Historical Backfill" },
    });
    if (!backfillSource) {
      backfillSource = await prisma.source.create({
        data: {
          clientId,
          name: "Historical Backfill",
          type: "backfill",
          category: "brand_monitoring",
          active: false, // Don't include in regular ingestion runs
        },
      });
    }

    // Build per-brand queries: client first, then each competitor
    const brandQueries: BrandQuery[] = [
      { brandName: context.name, query: `"${context.name}"`, type: "client" },
      ...competitors.map(c => ({
        brandName: c.name,
        query: `"${c.name}"`,
        type: "competitor" as const,
      })),
    ];

    let totalFetched = 0;
    let totalStored = 0;
    const perBrandStats: BrandStats[] = [];

    // Helper: store items tagged with their brand
    async function storeItems(
      items: Awaited<ReturnType<typeof fetchGoogleNews>>,
      brand: BrandQuery,
      sourceId: string
    ): Promise<number> {
      let stored = 0;
      for (const item of items) {
        if (!item.externalId) continue;
        try {
          // Merge brand metadata into rawData
          const rawDataObj = JSON.parse(item.rawData);
          rawDataObj.brandName = brand.brandName;
          rawDataObj.brandType = brand.type;

          await prisma.rawItem.upsert({
            where: { sourceId_externalId: { sourceId, externalId: item.externalId } },
            create: {
              sourceId,
              externalId: item.externalId,
              title: item.title,
              content: item.content,
              url: item.url,
              author: item.author,
              publishedAt: item.publishedAt,
              rawData: JSON.stringify(rawDataObj),
              status: "backfill", // Special status — not processed by AI pipeline
            },
            update: {},
          });
          stored++;
        } catch { /* skip duplicates */ }
      }
      return stored;
    }

    // 1. Google News for each brand (client + competitors)
    for (const brand of brandQueries) {
      const gnewsItems = await fetchGoogleNews(brand.query);
      const stored = await storeItems(gnewsItems, brand, backfillSource.id);

      totalFetched += gnewsItems.length;
      totalStored += stored;
      perBrandStats.push({
        brandName: brand.brandName,
        type: brand.type,
        fetched: gnewsItems.length,
        stored,
      });

      // Small delay between requests
      await new Promise(r => setTimeout(r, 300));
    }

    // 2. NewsAPI for each brand (if API key available)
    if (process.env.NEWS_API_KEY) {
      for (const brand of brandQueries) {
        try {
          const newsItems = await fetchNewsAPI(brand.query, {
            language: "en",
            sortBy: "publishedAt",
            pageSize: 50,
          });

          const stored = await storeItems(newsItems, brand, backfillSource.id);
          totalFetched += newsItems.length;
          totalStored += stored;

          // Update the matching per-brand stat entry
          const existing = perBrandStats.find(
            s => s.brandName === brand.brandName
          );
          if (existing) {
            existing.fetched += newsItems.length;
            existing.stored += stored;
          }

          await new Promise(r => setTimeout(r, 500)); // NewsAPI rate limit
        } catch (err) {
          console.error(`NewsAPI backfill failed for "${brand.query}":`, err);
        }
      }
    }

    // Update the backfill source timestamp
    await prisma.source.update({
      where: { id: backfillSource.id },
      data: { lastFetchedAt: new Date() },
    });

    // Summarise competitor stats
    const clientStats = perBrandStats.find(s => s.type === "client");
    const competitorStats = perBrandStats.filter(s => s.type === "competitor");

    return NextResponse.json({
      success: true,
      stats: {
        fetched: totalFetched,
        stored: totalStored,
        brands: brandQueries.length,
        client: clientStats
          ? { brandName: clientStats.brandName, fetched: clientStats.fetched, stored: clientStats.stored }
          : null,
        competitors: competitorStats.map(s => ({
          brandName: s.brandName,
          fetched: s.fetched,
          stored: s.stored,
        })),
        competitorTotals: {
          fetched: competitorStats.reduce((sum, s) => sum + s.fetched, 0),
          stored: competitorStats.reduce((sum, s) => sum + s.stored, 0),
        },
      },
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
