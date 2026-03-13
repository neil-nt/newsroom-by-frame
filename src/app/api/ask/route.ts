import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, question } = body as { clientId?: string; question?: string };

    if (!clientId || !question) {
      return NextResponse.json({ success: false, error: "clientId and question required" }, { status: 400 });
    }

    const context = await loadClientContext(clientId);
    if (!context) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    // Load recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { type: true, urgency: true, title: true, summary: true, whyItMatters: true, category: true, createdAt: true, sourceUrl: true, spokesperson: true, outcome: true },
    });

    // Load recent raw items for broader context
    const recentItems = await prisma.rawItem.findMany({
      where: { source: { clientId }, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select: { title: true, source: { select: { name: true } }, publishedAt: true, author: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Load latest white space opportunities
    const latestRun = await prisma.whiteSpaceRun.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: { opportunities: { take: 5, orderBy: { score: "desc" } } },
    });

    // Load journalists
    const journalists = await prisma.journalist.findMany({
      orderBy: { articleCount: "desc" },
      take: 15,
      select: { name: true, outlet: true, beat: true, articleCount: true },
    });

    // Load cached SOV
    const sovCache = await prisma.cachedReport.findUnique({
      where: { clientId_type: { clientId, type: "sov_30d" } },
    });
    const sovData = sovCache ? JSON.parse(sovCache.data) : null;

    // Build context for Claude
    const alertsSummary = recentAlerts.map(a =>
      `- [${a.type}/${a.urgency}] ${a.title} — ${a.summary} (${a.createdAt.toISOString().split("T")[0]})`
    ).join("\n");

    const articlesSummary = recentItems.map(item =>
      `- "${item.title}" — ${item.source.name}${item.author ? ` by ${item.author}` : ""} (${item.publishedAt?.toISOString().split("T")[0] || "unknown date"})`
    ).join("\n");

    const whiteSpaceSummary = latestRun?.opportunities.map(o =>
      `- ${o.suggestedHeadline} (score: ${Math.round(o.score * 100)}%, type: ${o.triggerType}, timing: ${o.timing})`
    ).join("\n") || "No white space analysis run yet.";

    const journalistsSummary = journalists.map(j =>
      `- ${j.name} (${j.outlet || "unknown outlet"}) — ${j.articleCount} articles, beat: ${j.beat || "general"}`
    ).join("\n");

    const sovSummary = sovData ?
      `Total mentions: ${sovData.totalMentions}\n${sovData.brands.map((b: any) => `- ${b.name}: ${b.mentions} mentions (${b.share}%)`).join("\n")}` :
      "No share of voice data yet.";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are the intelligence analyst for Newsroom by Frame, a media intelligence platform used by PR professionals. You answer questions about media coverage, trends, competitors, and opportunities for the client.

Be concise, specific, and actionable. Reference specific data points, articles, and journalists when relevant. If you don't have enough data to answer confidently, say so.

Client: ${context.name}
Positioning: ${context.positioning}
Competitors: ${context.competitors.map(c => c.name).join(", ")}`,
      messages: [{
        role: "user",
        content: `## RECENT ALERTS (last 20)
${alertsSummary || "No alerts yet."}

## RECENT ARTICLES (last 14 days, 50 most recent)
${articlesSummary || "No articles ingested yet."}

## WHITE SPACE OPPORTUNITIES
${whiteSpaceSummary}

## SHARE OF VOICE (30 days)
${sovSummary}

## JOURNALIST DATABASE (top 15 by article count)
${journalistsSummary || "No journalist data yet."}

## USER QUESTION
${question}`,
      }],
    });

    const answer = response.content[0].type === "text" ? response.content[0].text : "Unable to generate a response.";

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error("Ask error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
