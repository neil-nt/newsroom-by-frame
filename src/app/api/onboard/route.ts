import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

interface OnboardPayload {
  name: string;
  industry: string;
  website: string;
  description: string;
  competitors: { name: string; website: string }[];
  topics: string[];
  keyMessages: string;
  spokespeople: string[];
  toneOfVoice: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function googleNewsRssUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-GB&gl=GB&ceid=GB:en`;
}

/**
 * POST /api/onboard
 * Create a full client setup in a single transaction.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardPayload;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 },
      );
    }

    const slug = slugify(body.name);

    // Check for duplicate slug
    const existing = await prisma.client.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `A client with the slug "${slug}" already exists` },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Client
      const client = await tx.client.create({
        data: {
          name: body.name.trim(),
          slug,
          active: true,
        },
      });

      // 2. ClientContext
      await tx.clientContext.create({
        data: {
          clientId: client.id,
          positioning: body.description || "",
          messagePillars: body.keyMessages || "",
          toneOfVoice: body.toneOfVoice || "",
          toneExamples: "",
          avoidTopics: "",
          dataPoints: "",
          responseTemplates: "",
        },
      });

      // 3. Competitors
      const validCompetitors = (body.competitors || []).filter(
        (c) => c.name?.trim(),
      );
      for (const comp of validCompetitors) {
        await tx.competitor.create({
          data: {
            clientId: client.id,
            name: comp.name.trim(),
            position: "",
            messaging: "",
            strengths: "",
            weaknesses: "",
            trackUrls: comp.website || "",
          },
        });
      }

      // 4. Topics
      const validTopics = (body.topics || []).filter((t) => t?.trim());
      for (const topic of validTopics) {
        await tx.topic.create({
          data: {
            clientId: client.id,
            name: topic.trim(),
            authority: "",
            keywords: topic.trim().toLowerCase(),
          },
        });
      }

      // 5. Spokespeople
      const validSpokespeople = (body.spokespeople || []).filter(
        (s) => s?.trim(),
      );
      for (const name of validSpokespeople) {
        await tx.spokesperson.create({
          data: {
            clientId: client.id,
            name: name.trim(),
            role: "",
            expertise: "",
            active: true,
          },
        });
      }

      // 6. Sources — auto-generate Google News RSS for client + each competitor
      const sourceNames = [
        body.name.trim(),
        ...validCompetitors.map((c) => c.name.trim()),
      ];
      for (const sourceName of sourceNames) {
        await tx.source.create({
          data: {
            clientId: client.id,
            name: `Google News — ${sourceName}`,
            type: "rss",
            url: googleNewsRssUrl(sourceName),
            category: "news",
            active: true,
          },
        });
      }

      // Also add an industry source if industry is set
      if (body.industry?.trim()) {
        await tx.source.create({
          data: {
            clientId: client.id,
            name: `Google News — ${body.industry.trim()}`,
            type: "rss",
            url: googleNewsRssUrl(body.industry.trim()),
            category: "industry",
            active: true,
          },
        });
      }

      return client;
    });

    return NextResponse.json({ id: result.id, slug: result.slug });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 },
    );
  }
}
