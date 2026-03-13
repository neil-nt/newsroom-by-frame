import googleTrends from "google-trends-api";

export interface IngestableItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

/**
 * Small delay helper to avoid rate limiting.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch related rising queries for a single keyword from Google Trends.
 * Uses interestOverTime + relatedQueries for the last 7 days in GB.
 */
async function fetchKeywordTrends(
  keyword: string
): Promise<IngestableItem[]> {
  const items: IngestableItem[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch interest over time (used for context in rawData)
  let interestData: unknown = null;
  try {
    const interestRaw = await googleTrends.interestOverTime({
      keyword,
      startTime: sevenDaysAgo,
      geo: "GB",
    });
    interestData = JSON.parse(interestRaw);
  } catch (error) {
    console.warn(
      `Google Trends: failed to fetch interest over time for "${keyword}"`,
      error
    );
  }

  await delay(200);

  // Fetch related queries — these become our IngestableItems
  try {
    const relatedRaw = await googleTrends.relatedQueries({
      keyword,
      geo: "GB",
    });
    const relatedData = JSON.parse(relatedRaw);

    // relatedData.default.rankedList contains arrays:
    // [0] = top queries, [1] = rising queries
    const rankedList = relatedData?.default?.rankedList;
    if (Array.isArray(rankedList)) {
      // Prefer rising queries (index 1), fall back to top queries (index 0)
      const risingList = rankedList[1]?.rankedKeyword || [];
      const topList = rankedList[0]?.rankedKeyword || [];

      for (const entry of risingList) {
        const query = entry.query;
        const value = entry.value; // percentage increase or "Breakout"
        if (!query) continue;

        items.push({
          externalId: `gtrends-${keyword}-${query}-${Date.now()}`,
          title: `Rising search: "${query}" (related to ${keyword})`,
          content: `Search interest change: ${value ?? "unknown"}. Related rising query for "${keyword}" in the UK over the last 7 days.`,
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&geo=GB`,
          author: null,
          publishedAt: now,
          rawData: JSON.stringify({
            source: "google-trends-api",
            type: "related_rising",
            keyword,
            query,
            value,
            interestOverTime: interestData,
          }),
        });
      }

      // Also include top queries if no rising queries found
      if (risingList.length === 0) {
        for (const entry of topList) {
          const query = entry.query;
          const value = entry.value;
          if (!query) continue;

          items.push({
            externalId: `gtrends-${keyword}-${query}-${Date.now()}`,
            title: `Top search: "${query}" (related to ${keyword})`,
            content: `Relative search interest score: ${value ?? "unknown"}. Top related query for "${keyword}" in the UK.`,
            url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&geo=GB`,
            author: null,
            publishedAt: now,
            rawData: JSON.stringify({
              source: "google-trends-api",
              type: "related_top",
              keyword,
              query,
              value,
            }),
          });
        }
      }
    }
  } catch (error) {
    console.warn(
      `Google Trends: failed to fetch related queries for "${keyword}"`,
      error
    );
  }

  return items;
}

/**
 * Fetch today's daily trending searches in GB.
 */
async function fetchDailyTrendingSearches(): Promise<IngestableItem[]> {
  const items: IngestableItem[] = [];

  try {
    const raw = await googleTrends.dailyTrends({ geo: "GB" });
    const data = JSON.parse(raw);

    const trendingDays =
      data?.default?.trendingSearchesDays || [];

    for (const day of trendingDays) {
      const date = day.date || new Date().toISOString().split("T")[0];
      const searches = day.trendingSearches || [];

      for (const search of searches) {
        const trendTitle = search.title?.query;
        if (!trendTitle) continue;

        const traffic = search.formattedTraffic || "unknown";
        const relatedArticles = (search.articles || [])
          .slice(0, 3)
          .map(
            (a: { title?: string; url?: string }) =>
              `- ${a.title || "Untitled"} (${a.url || "no url"})`
          )
          .join("\n");

        const articleUrl = search.articles?.[0]?.url || null;

        items.push({
          externalId: `gtrends-daily-${trendTitle}-${date}`,
          title: `Trending search in UK: "${trendTitle}"`,
          content: [
            `Traffic volume: ${traffic}`,
            relatedArticles ? `\nRelated articles:\n${relatedArticles}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          url: articleUrl,
          author: null,
          publishedAt: new Date(date),
          rawData: JSON.stringify({
            source: "google-trends-api",
            type: "daily_trend",
            date,
            search,
          }),
        });
      }
    }
  } catch (error) {
    console.warn("Google Trends: failed to fetch daily trends", error);
  }

  return items;
}

/**
 * Fetch Google Trends data for an array of keywords plus daily trending searches.
 *
 * Uses the free google-trends-api package (no API key required).
 * - For each keyword: fetches interest over time and related rising queries (GB, last 7 days)
 * - Also fetches today's daily trending searches for GB
 *
 * Returns all results in a standard IngestableItem format.
 */
export async function fetchGoogleTrends(
  keywords: string[]
): Promise<IngestableItem[]> {
  const allItems: IngestableItem[] = [];

  try {
    // Fetch related queries for each keyword (with delay between calls)
    for (const keyword of keywords) {
      const keywordItems = await fetchKeywordTrends(keyword);
      allItems.push(...keywordItems);
      await delay(200);
    }

    // Fetch daily trending searches
    const dailyItems = await fetchDailyTrendingSearches();
    allItems.push(...dailyItems);
  } catch (error) {
    console.error("Google Trends: unexpected error in fetchGoogleTrends", error);
    return [];
  }

  return allItems;
}
