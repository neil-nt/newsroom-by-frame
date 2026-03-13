export interface SocialItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

// ─── X/Twitter ───────────────────────────────────────────

export async function fetchTwitterMentions(
  query: string,
  options: { maxResults?: number } = {}
): Promise<SocialItem[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("TWITTER_BEARER_TOKEN not set, skipping Twitter fetch");
    return [];
  }

  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(options.maxResults || 20),
    "tweet.fields": "created_at,author_id,public_metrics,text",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!response.ok) {
      console.error(
        `Twitter API error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    const users = new Map(
      (data.includes?.users || []).map((u: { id: string; name: string; username: string }) => [
        u.id,
        u,
      ])
    );

    return (data.data || []).map(
      (tweet: {
        id: string;
        text: string;
        author_id: string;
        created_at: string;
        public_metrics: Record<string, number>;
      }) => {
        const user = users.get(tweet.author_id) as
          | { name: string; username: string }
          | undefined;
        return {
          externalId: `twitter-${tweet.id}`,
          title: `@${user?.username || "unknown"}: ${tweet.text.slice(0, 100)}`,
          content: tweet.text,
          url: `https://twitter.com/${user?.username}/status/${tweet.id}`,
          author: user ? `${user.name} (@${user.username})` : null,
          publishedAt: new Date(tweet.created_at),
          rawData: JSON.stringify(tweet),
        };
      }
    );
  } catch (error) {
    console.error("Failed to fetch from Twitter", error);
    return [];
  }
}

// ─── Reddit ──────────────────────────────────────────────

let redditAccessToken: string | null = null;
let redditTokenExpiry = 0;

async function getRedditToken(): Promise<string | null> {
  if (redditAccessToken && Date.now() < redditTokenExpiry) {
    return redditAccessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("Reddit credentials not set, skipping Reddit fetch");
    return null;
  }

  try {
    const response = await fetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SFD-Insights-Engine/1.0",
        },
        body: "grant_type=client_credentials",
      }
    );

    const data = await response.json();
    redditAccessToken = data.access_token;
    redditTokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    return redditAccessToken;
  } catch (error) {
    console.error("Failed to get Reddit token", error);
    return null;
  }
}

export async function fetchRedditPosts(
  subreddit: string,
  query: string,
  options: { limit?: number; sort?: string } = {}
): Promise<SocialItem[]> {
  const token = await getRedditToken();
  if (!token) return [];

  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit || 20),
    sort: options.sort || "new",
    t: "week",
    restrict_sr: "on",
  });

  try {
    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "SFD-Insights-Engine/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Reddit API error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();

    return (data.data?.children || []).map(
      (post: {
        data: {
          id: string;
          title: string;
          selftext: string;
          permalink: string;
          author: string;
          created_utc: number;
        };
      }) => ({
        externalId: `reddit-${post.data.id}`,
        title: post.data.title,
        content: post.data.selftext || null,
        url: `https://reddit.com${post.data.permalink}`,
        author: post.data.author,
        publishedAt: new Date(post.data.created_utc * 1000),
        rawData: JSON.stringify(post.data),
      })
    );
  } catch (error) {
    console.error("Failed to fetch from Reddit", error);
    return [];
  }
}
