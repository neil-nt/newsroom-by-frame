import RSSParser from "rss-parser";

interface IngestableItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

const parser = new RSSParser();

/**
 * Fetch Google News results for a search query via RSS.
 * Returns ~30 recent articles per query. Free, no API key needed.
 */
export async function fetchGoogleNews(query: string, maxAgeDays = 30): Promise<IngestableItem[]> {
  const encodedQuery = encodeURIComponent(query);
  // Use Google News "when:" parameter to restrict to recent articles
  const url = `https://news.google.com/rss/search?q=${encodedQuery}+when:${maxAgeDays}d&hl=en-GB&gl=GB&ceid=GB:en`;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  try {
    const feed = await parser.parseURL(url);
    return (feed.items || [])
      .map(item => ({
        externalId: `gnews-${Buffer.from(item.link || item.title || "").toString("base64").slice(0, 64)}`,
        title: item.title || "Untitled",
        content: item.contentSnippet || item.content || null,
        url: item.link || null,
        author: item.creator || null,
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        rawData: JSON.stringify({ source: "google_news", query, ...item }),
      }))
      .filter(item => {
        // Discard articles older than the max age window
        if (!item.publishedAt) return true;
        return item.publishedAt >= cutoff;
      });
  } catch (error) {
    console.error(`Google News RSS fetch failed for "${query}":`, error);
    return [];
  }
}

/**
 * Fetch Google News for multiple brand/topic queries.
 */
export async function fetchGoogleNewsMulti(queries: string[]): Promise<IngestableItem[]> {
  const allItems: IngestableItem[] = [];

  for (const query of queries) {
    const items = await fetchGoogleNews(query);
    allItems.push(...items);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  return allItems;
}
