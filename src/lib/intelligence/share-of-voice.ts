import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";

export interface ShareOfVoiceData {
  clientName: string;
  period: string; // "7d", "30d", "90d"
  totalMentions: number;
  brands: {
    name: string;
    mentions: number;
    share: number; // 0-100 percentage
    sentiment: { positive: number; neutral: number; negative: number };
    topSources: string[];
  }[];
  topTopics: { topic: string; count: number }[];
  generatedAt: string;
}

export async function calculateShareOfVoice(
  clientId: string,
  periodDays: number = 30
): Promise<ShareOfVoiceData> {
  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client context not found");

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  // Get all raw items for this client's sources in the period
  // Use publishedAt when available (backfilled items), fall back to createdAt
  const rawItems = await prisma.rawItem.findMany({
    where: {
      source: { clientId },
      OR: [
        { publishedAt: { gte: since } },
        { publishedAt: null, createdAt: { gte: since } },
      ],
    },
    select: {
      title: true,
      content: true,
      rawData: true,
      source: { select: { name: true } },
    },
  });

  const clientName = context.name;
  const competitorNames = context.competitors.map((c) => c.name);
  const allBrands = [clientName, ...competitorNames];

  // Load stored brand aliases from ClientContext
  const clientContext = await prisma.clientContext.findUnique({
    where: { clientId },
    select: { brandAliases: true },
  });
  const storedAliases: string[] = clientContext?.brandAliases
    ? (() => { try { return JSON.parse(clientContext.brandAliases) as string[]; } catch { return []; } })()
    : [];

  // Build search aliases for each brand — the exact name plus shorter variations
  // e.g. "Food & Drink Scotland" also matches "food and drink scotland", "foodanddrink.scot"
  const brandAliases: Map<string, string[]> = new Map();
  for (const brand of allBrands) {
    const aliases = [brand.toLowerCase()];
    // Add version with & replaced by "and"
    if (brand.includes("&")) {
      aliases.push(brand.replace(/&/g, "and").toLowerCase());
    }
    // Add version with "and" replaced by &
    if (brand.toLowerCase().includes(" and ")) {
      aliases.push(brand.toLowerCase().replace(/ and /g, " & "));
    }
    // For multi-word names, add the core name without common suffixes
    const withoutSuffix = brand.replace(/\s*(Ltd|Limited|PLC|Inc|Association|Federation|Scotland)\s*$/i, "").trim().toLowerCase();
    if (withoutSuffix.length > 3 && withoutSuffix !== brand.toLowerCase()) {
      aliases.push(withoutSuffix);
    }
    // For the primary client brand, add any stored keyword aliases
    if (brand === clientName && storedAliases.length > 0) {
      for (const sa of storedAliases) {
        const lower = sa.toLowerCase();
        if (!aliases.includes(lower)) {
          aliases.push(lower);
        }
      }
    }
    brandAliases.set(brand, aliases);
  }

  // Count mentions for each brand
  const brandData: Map<
    string,
    {
      mentions: number;
      sources: Map<string, number>;
      positive: number;
      neutral: number;
      negative: number;
    }
  > = new Map();

  for (const brand of allBrands) {
    brandData.set(brand, {
      mentions: 0,
      sources: new Map(),
      positive: 0,
      neutral: 0,
      negative: 0,
    });
  }

  for (const item of rawItems) {
    const text = `${item.title} ${item.content || ""}`.toLowerCase();

    // Check if the rawData has a brandName tag (from backfill)
    let taggedBrand: string | null = null;
    try {
      const raw = JSON.parse(item.rawData || "{}");
      if (raw.brandName) taggedBrand = raw.brandName;
    } catch {}

    for (const brand of allBrands) {
      // Check 1: tagged brand from backfill metadata
      if (taggedBrand && taggedBrand.toLowerCase() === brand.toLowerCase()) {
        const data = brandData.get(brand)!;
        data.mentions++;
        const sourceCount = data.sources.get(item.source.name) || 0;
        data.sources.set(item.source.name, sourceCount + 1);
        // Simple sentiment
        const posWords = /leading|growth|award|best|top|excellent|innovative|strong|success|record/i;
        const negWords = /complaint|issue|problem|poor|worst|decline|fail|loss|controversy|crisis/i;
        if (posWords.test(text)) data.positive++;
        else if (negWords.test(text)) data.negative++;
        else data.neutral++;
        continue;
      }

      // Check 2: text matching with aliases
      const aliases = brandAliases.get(brand) || [brand.toLowerCase()];
      const matched = aliases.some((alias) => text.includes(alias));
      if (matched) {
        const data = brandData.get(brand)!;
        data.mentions++;

        // Track source
        const sourceCount = data.sources.get(item.source.name) || 0;
        data.sources.set(item.source.name, sourceCount + 1);

        // Simple sentiment from surrounding context
        const firstAlias = (brandAliases.get(brand) || [brand.toLowerCase()])[0];
        const idx = text.indexOf(firstAlias);
        const surrounding = idx >= 0
          ? text.slice(Math.max(0, idx - 100), idx + firstAlias.length + 100)
          : text.slice(0, 200);
        const posWords =
          /leading|growth|award|best|top|excellent|innovative|strong|success|record/i;
        const negWords =
          /complaint|issue|problem|poor|worst|decline|fail|loss|controversy|crisis/i;

        if (posWords.test(surrounding)) data.positive++;
        else if (negWords.test(surrounding)) data.negative++;
        else data.neutral++;
      }
    }
  }

  // Calculate shares
  let totalMentions = 0;
  for (const data of brandData.values()) {
    totalMentions += data.mentions;
  }

  const brands = allBrands
    .map((name) => {
      const data = brandData.get(name)!;
      const topSources = [...data.sources.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([source]) => source);

      return {
        name,
        mentions: data.mentions,
        share:
          totalMentions > 0
            ? Math.round((data.mentions / totalMentions) * 100)
            : 0,
        sentiment: {
          positive: data.positive,
          neutral: data.neutral,
          negative: data.negative,
        },
        topSources,
      };
    })
    .sort((a, b) => b.mentions - a.mentions);

  // Topic analysis
  const topicCounts: Map<string, number> = new Map();
  const topicKeywords = context.topics.map((t) => t.name.toLowerCase());

  for (const item of rawItems) {
    const text = `${item.title} ${item.content || ""}`.toLowerCase();
    for (const topic of topicKeywords) {
      if (text.includes(topic)) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
  }

  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const periodLabel =
    periodDays <= 7 ? "7d" : periodDays <= 30 ? "30d" : "90d";

  return {
    clientName,
    period: periodLabel,
    totalMentions,
    brands,
    topTopics,
    generatedAt: new Date().toISOString(),
  };
}
