import { loadClientContext } from "@/lib/intelligence/context";

interface JournoRequest {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author: string;
  publishedAt: Date;
  rawData: string;
  // Enriched fields
  journalist: string;
  outlet: string | null;
  deadline: string | null;
  matchedTopics: string[];
  relevanceScore: number;
}

/**
 * Fetch #journorequest tweets and match against client topics.
 */
export async function fetchJournoRequests(
  clientId: string
): Promise<JournoRequest[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("TWITTER_BEARER_TOKEN not set, skipping #journorequest fetch");
    return [];
  }

  const context = await loadClientContext(clientId);
  if (!context) return [];

  // Build keyword list from client topics
  const topicKeywords = context.topics.flatMap((t) => [
    t.name.toLowerCase(),
    ...t.keywords.map((k) => k.toLowerCase()),
  ]);

  // Search for #journorequest tweets
  const params = new URLSearchParams({
    query: "#journorequest -is:retweet lang:en",
    max_results: "50",
    "tweet.fields": "created_at,author_id,text",
    expansions: "author_id",
    "user.fields": "name,username,description",
  });

  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `Twitter API error for #journorequest: ${response.status} ${text}`
      );
      return [];
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) return [];

    // Build user map
    const users = new Map<
      string,
      { name: string; username: string; description: string }
    >();
    for (const user of data.includes?.users || []) {
      users.set(user.id, user);
    }

    const requests: JournoRequest[] = [];

    for (const tweet of data.data) {
      const user = users.get(tweet.author_id);
      const tweetText = tweet.text.toLowerCase();

      // Check topic relevance
      const matched = topicKeywords.filter((kw) => tweetText.includes(kw));
      if (matched.length === 0) continue; // Skip irrelevant requests

      const relevanceScore = Math.min(1, matched.length * 0.25);

      // Try to extract deadline from tweet text
      const deadlineMatch =
        tweet.text.match(/deadline[:\s]*([^.!?\n]+)/i) ||
        tweet.text.match(
          /by\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|this\s+\w+|next\s+\w+|end\s+of\s+\w+|\d{1,2}[\s/]\w+)/i
        );

      // Try to extract outlet from user bio or tweet
      let outlet: string | null = null;
      if (user?.description) {
        // Common patterns: "Reporter at The Herald", "Journalist, BBC"
        const outletMatch = user.description.match(
          /(?:at|for|@|,\s*)\s*(the\s+\w+[\w\s]*|bbc[\w\s]*|sky[\w\s]*|itv[\w\s]*|guardian|telegraph|times|mail|herald|scotsman|financial\s+times|ft|reuters|bloomberg)/i
        );
        if (outletMatch) outlet = outletMatch[1].trim();
      }

      requests.push({
        externalId: `journoreq-${tweet.id}`,
        title: `#journorequest from @${user?.username || "unknown"}: ${tweet.text.slice(0, 100)}`,
        content: tweet.text,
        url: `https://twitter.com/${user?.username || "i"}/status/${tweet.id}`,
        author: user ? `${user.name} (@${user.username})` : "Unknown",
        publishedAt: new Date(tweet.created_at),
        rawData: JSON.stringify({ tweet, user }),
        journalist: user?.name || "Unknown",
        outlet,
        deadline: deadlineMatch?.[1]?.trim() || null,
        matchedTopics: matched,
        relevanceScore,
      });
    }

    // Sort by relevance
    requests.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return requests;
  } catch (error) {
    console.error("Failed to fetch #journorequest tweets:", error);
    return [];
  }
}
