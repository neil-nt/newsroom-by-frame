export interface SearchTrendItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

/**
 * Fetch Google Trends data via SerpAPI.
 * Returns trending searches and related queries for given keywords.
 */
export async function fetchSearchTrends(
  keyword: string,
  options: {
    geo?: string;
    timeRange?: string; // "now 7-d", "today 1-m", "today 3-m"
  } = {}
): Promise<SearchTrendItem[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    console.warn("SERP_API_KEY not set, skipping search trends");
    return [];
  }

  const params = new URLSearchParams({
    engine: "google_trends",
    q: keyword,
    geo: options.geo || "GB",
    date: options.timeRange || "now 7-d",
    api_key: apiKey,
  });

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(
        `SerpAPI error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();

    const items: SearchTrendItem[] = [];

    // Extract related queries as trend signals
    if (data.related_queries?.rising) {
      for (const query of data.related_queries.rising) {
        items.push({
          externalId: `trend-${keyword}-${query.query}`,
          title: `Rising search: "${query.query}" (related to ${keyword})`,
          content: `Search interest increase: ${query.value || "breakout"}. Related to "${keyword}" in the UK.`,
          url: null,
          author: null,
          publishedAt: new Date(),
          rawData: JSON.stringify({ keyword, query, source: "google_trends" }),
        });
      }
    }

    // Extract related topics
    if (data.related_topics?.rising) {
      for (const topic of data.related_topics.rising) {
        items.push({
          externalId: `trend-topic-${keyword}-${topic.topic?.title}`,
          title: `Rising topic: "${topic.topic?.title}" (related to ${keyword})`,
          content: `Topic interest increase: ${topic.value || "breakout"}. Type: ${topic.topic?.type || "unknown"}.`,
          url: null,
          author: null,
          publishedAt: new Date(),
          rawData: JSON.stringify({ keyword, topic, source: "google_trends" }),
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Failed to fetch search trends for: ${keyword}`, error);
    return [];
  }
}
