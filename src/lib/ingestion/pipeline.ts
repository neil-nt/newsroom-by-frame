import { prisma } from "@/lib/db/client";
import { fetchRSSFeed } from "./sources/rss";
import { fetchNewsAPI } from "./sources/news-api";
import { fetchSearchTrends } from "./sources/search-trends";
import { fetchTwitterMentions, fetchRedditPosts } from "./sources/social";
import { fetchEventbriteEvents } from "./sources/events";
import { fetchGoogleTrends } from "./sources/google-trends";
import { fetchCompaniesHouseFilings } from "./sources/companies-house";
import { fetchGoogleNews } from "./sources/google-news";
import { preFilter, analyzeSignal } from "@/lib/intelligence/analyzer";
import { loadClientContext } from "@/lib/intelligence/context";
import { notifyIfBreaking } from "@/lib/delivery/slack";
import { extractBylines } from "@/lib/intelligence/bylines";

interface IngestableItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

/**
 * Fetch items from a single source based on its type and config.
 */
async function fetchFromSource(source: {
  id: string;
  type: string;
  url: string | null;
  config: string | null;
}): Promise<IngestableItem[]> {
  const config = source.config ? JSON.parse(source.config) : {};

  switch (source.type) {
    case "rss":
      if (!source.url) return [];
      return fetchRSSFeed(source.url);

    case "news_api":
      return fetchNewsAPI(config.query || "", {
        language: config.language,
        sortBy: config.sortBy,
        from: config.from,
        pageSize: config.pageSize,
      });

    case "search_trends":
      return fetchSearchTrends(config.keyword || "", {
        geo: config.geo,
        timeRange: config.timeRange,
      });

    case "social": {
      const items: IngestableItem[] = [];
      if (config.twitter?.query) {
        const tweets = await fetchTwitterMentions(config.twitter.query, {
          maxResults: config.twitter.maxResults,
        });
        items.push(...tweets);
      }
      if (config.reddit?.subreddit) {
        const posts = await fetchRedditPosts(
          config.reddit.subreddit,
          config.reddit.query || "",
          { limit: config.reddit.limit }
        );
        items.push(...posts);
      }
      return items;
    }

    case "events":
      return fetchEventbriteEvents(config.query || "", {
        locationAddress: config.location,
        startDateRange: config.startDate,
      });

    case "google_trends":
      return fetchGoogleTrends(config.keywords || []);

    case "companies_house":
      return fetchCompaniesHouseFilings(config.companyName || config.query || "", {
        itemsPerPage: config.itemsPerPage,
      });

    case "google_news":
      return fetchGoogleNews(config.query || source.url || "");

    default:
      console.warn(`Unknown source type: ${source.type}`);
      return [];
  }
}

/**
 * Run the full ingestion pipeline for a single client.
 *
 * 1. Fetch from all active sources
 * 2. Deduplicate and store raw items
 * 3. Pre-filter for relevance (cheap/fast)
 * 4. Full analysis on relevant items (deeper/slower)
 * 5. Create alerts for actionable items
 */
export async function runPipelineForClient(clientId: string): Promise<{
  fetched: number;
  new: number;
  relevant: number;
  alerts: number;
}> {
  const stats = { fetched: 0, new: 0, relevant: 0, alerts: 0 };

  // Load client context for analysis
  const context = await loadClientContext(clientId);
  if (!context) {
    console.error(`No context found for client ${clientId}`);
    return stats;
  }

  // Get all active sources for this client
  const sources = await prisma.source.findMany({
    where: { clientId, active: true },
  });

  // Fetch from all sources
  for (const source of sources) {
    const items = await fetchFromSource(source);
    stats.fetched += items.length;

    // Store raw items (skip duplicates)
    for (const item of items) {
      if (!item.externalId) continue;

      try {
        const rawItem = await prisma.rawItem.upsert({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: item.externalId,
            },
          },
          create: {
            sourceId: source.id,
            externalId: item.externalId,
            title: item.title,
            content: item.content,
            url: item.url,
            author: item.author,
            publishedAt: item.publishedAt,
            rawData: item.rawData,
            status: "pending",
          },
          update: {}, // Don't update existing items
        });

        // Only process newly created items
        if (rawItem.status === "pending") {
          stats.new++;
        }
      } catch (error) {
        // Unique constraint violation = duplicate, skip silently
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          continue;
        }
        console.error(`Failed to store item: ${item.title}`, error);
      }
    }

    // Update last fetched timestamp
    await prisma.source.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });
  }

  // Process pending items
  const pendingItems = await prisma.rawItem.findMany({
    where: {
      source: { clientId },
      status: "pending",
    },
    include: { source: true },
    orderBy: { createdAt: "desc" },
    take: 50, // Process in batches
  });

  for (const item of pendingItems) {
    // Stage 1: Pre-filter
    const signal = {
      title: item.title,
      content: item.content,
      url: item.url,
      author: item.author,
      publishedAt: item.publishedAt,
      sourceType: item.source.type,
      sourceName: item.source.name,
    };

    const filterResult = await preFilter(signal, context);

    if (!filterResult.relevant || filterResult.relevanceScore < 0.2) {
      await prisma.rawItem.update({
        where: { id: item.id },
        data: {
          status: "filtered",
          relevanceScore: filterResult.relevanceScore,
        },
      });
      continue;
    }

    stats.relevant++;

    // Stage 2: Full analysis
    await prisma.rawItem.update({
      where: { id: item.id },
      data: { status: "processing", relevanceScore: filterResult.relevanceScore },
    });

    try {
      const analysis = await analyzeSignal(signal, context);

      // Create alert
      await prisma.alert.create({
        data: {
          clientId,
          rawItemId: item.id,
          type: analysis.type,
          urgency: analysis.urgency,
          category: analysis.category,
          title: analysis.title,
          summary: analysis.summary,
          whyItMatters: analysis.whyItMatters,
          draftResponse: analysis.draftResponse,
          spokesperson: analysis.spokesperson,
          targetMedia: JSON.stringify(analysis.targetMedia),
          dataPoints: JSON.stringify(analysis.dataPoints),
          confidence: analysis.confidence,
          sourceUrl: item.url,
          publishedAt: item.publishedAt,
        },
      });

      await prisma.rawItem.update({
        where: { id: item.id },
        data: { status: "analysed" },
      });

      stats.alerts++;

      // Send Slack notification for breaking/critical alerts
      await notifyIfBreaking(analysis).catch((err) =>
        console.error("Slack notification failed:", err)
      );
    } catch (error) {
      console.error(`Failed to analyse item: ${item.title}`, error);
      await prisma.rawItem.update({
        where: { id: item.id },
        data: { status: "error" },
      });
    }
  }

  // Extract journalist bylines from analysed items
  await extractBylines(clientId).catch((err) =>
    console.error("Byline extraction failed:", err)
  );

  return stats;
}

/**
 * Run the pipeline for all active clients.
 */
export async function runPipelineForAllClients() {
  const clients = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const results: Record<string, Awaited<ReturnType<typeof runPipelineForClient>>> = {};

  for (const client of clients) {
    console.log(`Running pipeline for: ${client.name}`);
    results[client.name] = await runPipelineForClient(client.id);
    console.log(`Completed: ${client.name}`, results[client.name]);
  }

  return results;
}
