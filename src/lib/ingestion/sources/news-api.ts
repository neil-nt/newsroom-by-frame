export interface NewsAPIArticle {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    publishedAt: string;
    content: string | null;
  }>;
}

export async function fetchNewsAPI(
  query: string,
  options: {
    language?: string;
    sortBy?: "relevancy" | "popularity" | "publishedAt";
    from?: string; // ISO date
    pageSize?: number;
  } = {}
): Promise<NewsAPIArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("NEWS_API_KEY not set, skipping NewsAPI fetch");
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    language: options.language || "en",
    sortBy: options.sortBy || "publishedAt",
    pageSize: String(options.pageSize || 20),
    apiKey,
  });

  if (options.from) {
    params.set("from", options.from);
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`NewsAPI error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: NewsAPIResponse = await response.json();

    return data.articles.map((article) => ({
      externalId: article.url,
      title: article.title,
      content: article.description || article.content || null,
      url: article.url,
      author: article.author,
      publishedAt: new Date(article.publishedAt),
      rawData: JSON.stringify(article),
    }));
  } catch (error) {
    console.error("Failed to fetch from NewsAPI", error);
    return [];
  }
}
