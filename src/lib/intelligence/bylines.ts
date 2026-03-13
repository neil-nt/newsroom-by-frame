import { prisma } from "@/lib/db/client";

/**
 * Extract journalist bylines from recently ingested articles.
 * Runs after each ingestion cycle to build up the journalist database.
 */
export async function extractBylines(clientId: string): Promise<number> {
  // Get analysed items that have an author field
  const items = await prisma.rawItem.findMany({
    where: {
      source: { clientId },
      status: "analysed",
      author: { not: null },
    },
    select: {
      author: true,
      title: true,
      url: true,
      publishedAt: true,
      source: { select: { name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let count = 0;

  for (const item of items) {
    const authorName = cleanAuthorName(item.author!);
    if (!authorName || authorName.length < 3 || authorName.length > 100) continue;

    const outlet = item.source.name;
    const beat = item.source.category || null;

    try {
      await prisma.journalist.upsert({
        where: {
          name_outlet: { name: authorName, outlet: outlet },
        },
        create: {
          name: authorName,
          outlet,
          beat,
          articleCount: 1,
          lastSeenAt: item.publishedAt || new Date(),
        },
        update: {
          articleCount: { increment: 1 },
          lastSeenAt: item.publishedAt || new Date(),
          beat: beat || undefined,
        },
      });
      count++;
    } catch {
      // Ignore constraint errors
    }
  }

  return count;
}

/**
 * Clean up author names from RSS feeds and APIs.
 * Handles common patterns like "By John Smith", "john.smith@example.com", etc.
 */
function cleanAuthorName(raw: string): string {
  let name = raw.trim();

  // Remove "By " prefix
  name = name.replace(/^by\s+/i, "");

  // Remove email addresses
  name = name.replace(/\S+@\S+\.\S+/g, "").trim();

  // Remove URLs
  name = name.replace(/https?:\/\/\S+/g, "").trim();

  // Remove common suffixes like ", Reporter" or "| BBC News"
  name = name.replace(/\s*[,|]\s*(reporter|correspondent|editor|journalist|writer|staff|contributor|bbc|sky).*/i, "").trim();

  // If it looks like "Smith, John" — flip it
  if (/^[A-Z][a-z]+,\s+[A-Z]/.test(name)) {
    const parts = name.split(",").map((p) => p.trim());
    if (parts.length === 2) {
      name = `${parts[1]} ${parts[0]}`;
    }
  }

  // Remove anything in parentheses
  name = name.replace(/\([^)]*\)/g, "").trim();

  // Only keep if it looks like a person's name (at least two words, mostly letters)
  const words = name.split(/\s+/);
  if (words.length < 2) return "";
  if (!/^[A-Za-z\u00C0-\u024F\s'-]+$/.test(name)) return "";

  return name;
}

/**
 * Get journalists ranked by article count for a specific beat/topic.
 */
export async function getTopJournalists(options?: {
  beat?: string;
  outlet?: string;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (options?.beat) where.beat = options.beat;
  if (options?.outlet) where.outlet = { contains: options.outlet };

  return prisma.journalist.findMany({
    where,
    orderBy: { articleCount: "desc" },
    take: options?.limit || 20,
  });
}
