import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";

export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  total: number;
  byBrand: Record<string, number>;
  byTopic: Record<string, number>;
}

export interface TrendData {
  clientName: string;
  period: number;
  dailyMentions: DailyDataPoint[];
  brands: string[];
  topics: string[];
  generatedAt: string;
}

export async function aggregateTrends(
  clientId: string,
  periodDays: number = 30
): Promise<TrendData> {
  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client not found");

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  // Use publishedAt when available (backfilled items have real publish dates)
  // Fall back to createdAt for items without publishedAt
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
      publishedAt: true,
      createdAt: true,
    },
    orderBy: { publishedAt: "asc" },
  });

  const clientName = context.name;
  const competitorNames = context.competitors.map((c) => c.name);
  const allBrands = [clientName, ...competitorNames];
  const topicNames = context.topics.slice(0, 8).map((t) => t.name);

  // Load stored brand aliases from ClientContext
  const clientContext = await prisma.clientContext.findUnique({
    where: { clientId },
    select: { brandAliases: true },
  });
  const storedAliases: string[] = clientContext?.brandAliases
    ? (() => { try { return JSON.parse(clientContext.brandAliases) as string[]; } catch { return []; } })()
    : [];

  // Build brand aliases for fuzzy matching (e.g. "Food & Drink Scotland" also matches "food and drink scotland")
  const brandAliases: Map<string, string[]> = new Map();
  for (const brand of allBrands) {
    const aliases = [brand.toLowerCase()];
    if (brand.includes("&")) aliases.push(brand.replace(/&/g, "and").toLowerCase());
    if (brand.toLowerCase().includes(" and ")) aliases.push(brand.toLowerCase().replace(/ and /g, " & "));
    const withoutSuffix = brand.replace(/\s*(Ltd|Limited|PLC|Inc|Association|Federation|Scotland)\s*$/i, "").trim().toLowerCase();
    if (withoutSuffix.length > 3 && withoutSuffix !== brand.toLowerCase()) aliases.push(withoutSuffix);
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

  // Build daily buckets
  const dailyMap = new Map<string, DailyDataPoint>();

  // Pre-fill all days in the period
  for (let i = 0; i < periodDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (periodDays - 1 - i));
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, {
      date: key,
      total: 0,
      byBrand: Object.fromEntries(allBrands.map((b) => [b, 0])),
      byTopic: Object.fromEntries(topicNames.map((t) => [t, 0])),
    });
  }

  for (const item of rawItems) {
    const itemDate = item.publishedAt || item.createdAt;
    const key = itemDate.toISOString().split("T")[0];
    const day = dailyMap.get(key);
    if (!day) continue;

    day.total++;
    const text = `${item.title} ${item.content || ""}`.toLowerCase();

    // Check for tagged brand from backfill metadata
    let taggedBrand: string | null = null;
    try {
      const raw = JSON.parse(item.rawData || "{}");
      if (raw.brandName) taggedBrand = raw.brandName;
    } catch {}

    for (const brand of allBrands) {
      // Match by tag or by text alias
      const isTagged = taggedBrand && taggedBrand.toLowerCase() === brand.toLowerCase();
      const aliases = brandAliases.get(brand) || [brand.toLowerCase()];
      if (isTagged || aliases.some((a) => text.includes(a))) {
        day.byBrand[brand]++;
      }
    }

    for (const topic of topicNames) {
      if (text.includes(topic.toLowerCase())) {
        day.byTopic[topic]++;
      }
    }
  }

  return {
    clientName,
    period: periodDays,
    dailyMentions: Array.from(dailyMap.values()),
    brands: allBrands,
    topics: topicNames,
    generatedAt: new Date().toISOString(),
  };
}
