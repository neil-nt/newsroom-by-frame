import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "SFD-Insights-Engine/1.0",
  },
});

export interface RSSItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

export async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.map((item) => ({
      externalId: item.guid || item.link || item.title || "",
      title: item.title || "Untitled",
      content: item.contentSnippet || item.content || null,
      url: item.link || null,
      author: item.creator || item.author || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      rawData: JSON.stringify(item),
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS feed: ${feedUrl}`, error);
    return [];
  }
}
