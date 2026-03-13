import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";
import type { ClientContextForAnalysis } from "@/lib/intelligence/analyzer";

const anthropic = new Anthropic();

// ─── Types ──────────────────────────────────────────────

export interface EvidenceSource {
  title: string;
  url: string | null;
  sourceName: string;
  relevance: string; // why this article is evidence
}

export interface WhiteSpaceOpportunity {
  topic: string;
  opportunity: string;
  suggestedHeadline: string;
  score: number;
  timing: string;
  triggerType: "gap" | "trend" | "calendar" | "competitor_silence";

  // Evidence trail
  theGap: string;        // what's being discussed and who's NOT talking about it
  yourAdvantage: string; // why the client specifically can own this
  theWindow: string;     // how long this opportunity is open and why now

  // Sources that informed this opportunity
  evidenceSources: EvidenceSource[];

  // Calendar trigger if applicable
  calendarEvent: string | null;
  calendarDate: string | null;

  // Competitor analysis
  competitorSilence: string; // which competitors are absent and why

  // Action plan
  actionSteps: string[];      // ordered list of concrete next steps
  pitchAngle: string;         // the hook for journalists
  spokespersonBrief: string;  // what to brief the spokesperson on
  spokesperson: string | null;

  // Clearly labeled outputs
  pitchTo: string[];           // suggested publications to pitch to
  relevantDataPoints: string[];
}

interface EditorialCalendarEntry {
  date: string;
  event: string;
  relevantTopics: string[];
  type: "regulatory" | "tariff" | "awareness" | "parliamentary" | "industry";
}

interface TopicCluster {
  keyword: string;
  count: number;
  recentTitles: string[];
  recentUrls: string[];
  velocity: number;
}

interface RawItemWithSource {
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  relevanceScore: number | null;
  source: { name: string; type: string };
}

// ─── Editorial Calendar (Water Industry) ────────────────

const EDITORIAL_CALENDAR: EditorialCalendarEntry[] = [
  {
    date: "2026-04-01",
    event: "Ofwat annual tariff review effective date",
    relevantTopics: ["water bills", "tariffs", "regulation", "pricing"],
    type: "tariff",
  },
  {
    date: "2026-04-22",
    event: "Earth Day",
    relevantTopics: ["sustainability", "water conservation", "environment", "ESG"],
    type: "awareness",
  },
  {
    date: "2026-05-01",
    event: "Water Saving Week (start)",
    relevantTopics: ["water efficiency", "conservation", "sustainability", "business water use"],
    type: "awareness",
  },
  {
    date: "2026-06-05",
    event: "World Environment Day",
    relevantTopics: ["sustainability", "water stewardship", "ESG", "environment"],
    type: "awareness",
  },
  {
    date: "2026-07-01",
    event: "Ofwat mid-year performance report deadline",
    relevantTopics: ["regulation", "customer service", "water quality", "leakage"],
    type: "regulatory",
  },
  {
    date: "2026-03-22",
    event: "World Water Day",
    relevantTopics: ["water access", "water conservation", "sustainability", "water industry"],
    type: "awareness",
  },
  {
    date: "2026-04-15",
    event: "MOSL market performance report Q1",
    relevantTopics: ["business water market", "switching", "market reform", "competition"],
    type: "regulatory",
  },
  {
    date: "2026-05-14",
    event: "Environment, Food and Rural Affairs Committee session",
    relevantTopics: ["water regulation", "sewage", "water quality", "policy"],
    type: "parliamentary",
  },
  {
    date: "2026-09-01",
    event: "Ofwat PR29 price review consultation opens",
    relevantTopics: ["price review", "regulation", "investment", "infrastructure"],
    type: "regulatory",
  },
  {
    date: "2026-06-15",
    event: "Water UK annual conference",
    relevantTopics: ["water industry", "innovation", "sustainability", "infrastructure"],
    type: "industry",
  },
  {
    date: "2026-10-01",
    event: "Non-household water market annual review",
    relevantTopics: ["business water", "market reform", "switching", "competition"],
    type: "regulatory",
  },
  {
    date: "2026-11-15",
    event: "Autumn Statement / Budget water infrastructure announcements",
    relevantTopics: ["investment", "infrastructure", "policy", "water bills"],
    type: "parliamentary",
  },
];

// ─── Data Loading ───────────────────────────────────────

async function loadRecentRawItems(clientId: string, days: number = 14): Promise<RawItemWithSource[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.rawItem.findMany({
    where: {
      source: { clientId },
      createdAt: { gte: since },
    },
    select: {
      title: true,
      content: true,
      url: true,
      author: true,
      publishedAt: true,
      createdAt: true,
      relevanceScore: true,
      source: { select: { name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

async function loadTrendSnapshots(clientId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  return prisma.trendSnapshot.findMany({
    where: {
      clientId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Gap Analysis ───────────────────────────────────────

function buildTopicClusters(
  rawItems: RawItemWithSource[],
  topicKeywords: string[]
): TopicCluster[] {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const clusters: Map<string, { recent: { title: string; url: string | null }[]; prior: string[]; total: string[] }> =
    new Map();

  for (const keyword of topicKeywords) {
    clusters.set(keyword.toLowerCase(), { recent: [], prior: [], total: [] });
  }

  for (const item of rawItems) {
    const text = `${item.title} ${item.content || ""}`.toLowerCase();
    const itemDate = item.publishedAt || item.createdAt;

    for (const keyword of topicKeywords) {
      const kw = keyword.toLowerCase();
      if (text.includes(kw)) {
        const cluster = clusters.get(kw)!;
        cluster.total.push(item.title);
        if (itemDate >= sevenDaysAgo) {
          cluster.recent.push({ title: item.title, url: item.url });
        } else if (itemDate >= fourteenDaysAgo) {
          cluster.prior.push(item.title);
        }
      }
    }
  }

  return Array.from(clusters.entries())
    .map(([keyword, data]) => {
      const priorCount = Math.max(data.prior.length, 1);
      const velocity = data.recent.length / priorCount;
      return {
        keyword,
        count: data.total.length,
        recentTitles: data.recent.slice(0, 5).map((r) => r.title),
        recentUrls: data.recent.slice(0, 5).map((r) => r.url || ""),
        velocity,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.velocity - a.velocity);
}

// ─── Calendar Matching ──────────────────────────────────

function getUpcomingCalendarEvents(
  topics: ClientContextForAnalysis["topics"],
  windowDays: number = 60
): (EditorialCalendarEntry & { daysAway: number; matchedTopics: string[] })[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const topicKeywords = topics.flatMap((t) =>
    [t.name, ...t.keywords].map((k) => k.toLowerCase())
  );

  return EDITORIAL_CALENDAR.filter((entry) => {
    const eventDate = new Date(entry.date);
    return eventDate >= now && eventDate <= cutoff;
  })
    .map((entry) => {
      const eventDate = new Date(entry.date);
      const daysAway = Math.ceil(
        (eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const matchedTopics = entry.relevantTopics.filter((rt) =>
        topicKeywords.some(
          (tk) => rt.toLowerCase().includes(tk) || tk.includes(rt.toLowerCase())
        )
      );
      return { ...entry, daysAway, matchedTopics };
    })
    .filter((entry) => entry.matchedTopics.length > 0)
    .sort((a, b) => a.daysAway - b.daysAway);
}

// ─── Claude Analysis ────────────────────────────────────

async function analyzeWhiteSpace(
  context: ClientContextForAnalysis,
  topicClusters: TopicCluster[],
  upcomingEvents: ReturnType<typeof getUpcomingCalendarEvents>,
  rawItems: RawItemWithSource[]
): Promise<WhiteSpaceOpportunity[]> {
  const dataPointsList = context.dataPoints
    .map((dp) => `- ${dp.metric}: ${dp.value} (${dp.context})`)
    .join("\n");

  const spokespeopleList = context.spokespeople
    .map(
      (sp) =>
        `- ${sp.name}, ${sp.role}: expertise in ${sp.expertise.join(", ")}`
    )
    .join("\n");

  const topicsList = context.topics
    .map((t) => `- ${t.name} [authority: ${t.authority}] (keywords: ${t.keywords.join(", ")})`)
    .join("\n");

  const competitorsList = context.competitors
    .map((c) => `- ${c.name}: ${c.position} (strengths: ${c.strengths.join(", ")})`)
    .join("\n");

  const trendingClusters = topicClusters
    .slice(0, 15)
    .map(
      (c) =>
        `- "${c.keyword}": ${c.count} mentions, velocity ${c.velocity.toFixed(1)}x, recent: ${c.recentTitles.slice(0, 3).join(" | ")}`
    )
    .join("\n");

  const calendarList = upcomingEvents
    .slice(0, 10)
    .map(
      (e) =>
        `- ${e.date} (${e.daysAway} days away): ${e.event} [matched topics: ${e.matchedTopics.join(", ")}]`
    )
    .join("\n");

  // Build a numbered source list with titles and URLs so Claude can reference them
  const sourceList = rawItems
    .slice(0, 50)
    .map(
      (item, i) =>
        `[${i + 1}] "${item.title}" — ${item.source.name} (${item.source.type})${item.url ? ` — ${item.url}` : ""}`
    )
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `You are the White Space Radar for Newsroom by Frame, a media intelligence platform for PR professionals.

Your job is to identify proactive media opportunities where ${context.name} can own a narrative that competitors aren't covering. Each opportunity must be backed by specific evidence from the sources provided.

## CLIENT CONTEXT

**Positioning:** ${context.positioning}

**Message Pillars:**
${context.messagePillars.map((p) => `- ${p}`).join("\n")}

**Topics & Authority Levels:**
${topicsList}

**Key Data Points:**
${dataPointsList}

**Spokespeople:**
${spokespeopleList}

**Competitors:**
${competitorsList}

## SOURCES ANALYSED (last 14 days)

${sourceList || "No sources available yet"}

## TOPIC VELOCITY (keyword: mentions, acceleration)

${trendingClusters || "No topic clusters detected yet"}

## UPCOMING EDITORIAL CALENDAR

${calendarList || "No upcoming calendar events matched"}

## INSTRUCTIONS

Identify 5-8 white space opportunities. For EACH opportunity, you MUST:

1. **Reference specific sources** from the numbered list above that informed the opportunity. Use the source numbers [1], [2], etc. and include the article title and URL.

2. **Explain the gap clearly**: What's being discussed in the media, and which specific competitors are NOT talking about it.

3. **Explain the client's advantage**: Why ${context.name} specifically can own this — cite their data points, spokesperson expertise, or positioning.

4. **Define the window**: Is this time-sensitive? How long is the opportunity open? If tied to a calendar event, say which one and when.

5. **Provide a concrete action plan**: Ordered steps — who to brief, what to pitch, to whom, and by when.

Respond with a JSON array only:
[
  {
    "topic": "the topic area",
    "opportunity": "1-2 sentence summary of the specific angle",
    "suggestedHeadline": "a pitch-ready headline a journalist would actually use",
    "score": 0.0-1.0,
    "timing": "this week" | "next two weeks" | "next month" | "next quarter" | "ongoing",
    "triggerType": "gap" | "trend" | "calendar" | "competitor_silence",

    "theGap": "2-3 sentences: what's being discussed in the media right now, specifically which outlets are covering it, and who is NOT part of the conversation",
    "yourAdvantage": "2-3 sentences: why ${context.name} can credibly own this space — reference specific data points, expertise, or market position",
    "theWindow": "1-2 sentences: how long this opportunity is open and what makes the timing right now",

    "evidenceSources": [
      { "title": "exact article title from the source list", "url": "the URL from the source list or null", "sourceName": "publication name", "relevance": "1 sentence: why this article is evidence for this opportunity" }
    ],

    "calendarEvent": "name of calendar event if applicable, or null",
    "calendarDate": "YYYY-MM-DD if applicable, or null",

    "competitorSilence": "1-2 sentences: which specific competitors (by name) are absent from this topic and why that creates an opening",

    "actionSteps": [
      "Step 1: Brief [spokesperson name] on [specific topic] — include [specific data points]",
      "Step 2: Draft [type of content] with angle: [specific angle]",
      "Step 3: Pitch to [specific journalist/outlet] by [timeline]",
      "Step 4: [follow-up action]"
    ],
    "pitchAngle": "the specific hook that would make a journalist interested — not generic",
    "spokespersonBrief": "2-3 sentences: what the spokesperson needs to know and the key messages to land",
    "spokesperson": "name of best spokesperson or null",

    "pitchTo": ["2-4 specific real UK publications to pitch this to"],
    "relevantDataPoints": ["specific client data points to reference in the pitch"]
  }
]

IMPORTANT:
- evidenceSources MUST reference real articles from the source list above with correct titles and URLs
- pitchTo is where to SEND the pitch (suggested outlets), NOT where the data came from
- actionSteps must be specific and actionable — include names, data points, and timelines
- competitorSilence must name specific competitors
- Only suggest opportunities where ${context.name} genuinely has data or authority`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`No JSON array found in response: ${text}`);
    const opportunities: WhiteSpaceOpportunity[] = JSON.parse(jsonMatch[0]);

    return opportunities.map((opp) => ({
      ...opp,
      score: Math.max(0, Math.min(1, opp.score)),
    }));
  } catch (error) {
    console.error("White space analysis parse error:", error);
    return [];
  }
}

// ─── Main Entry Point ───────────────────────────────────

export async function detectWhiteSpace(
  clientId: string
): Promise<{ opportunities: WhiteSpaceOpportunity[]; metadata: Record<string, unknown> }> {
  const context = await loadClientContext(clientId);
  if (!context) {
    throw new Error(`Client context not found for clientId: ${clientId}`);
  }

  const [rawItems, trendSnapshots] = await Promise.all([
    loadRecentRawItems(clientId),
    loadTrendSnapshots(clientId),
  ]);

  const allKeywords = context.topics.flatMap((t) => [t.name, ...t.keywords]);
  const topicClusters = buildTopicClusters(rawItems, allKeywords);

  for (const cluster of topicClusters) {
    const matchingSnapshot = trendSnapshots.find(
      (ts) => ts.topic.toLowerCase() === cluster.keyword.toLowerCase()
    );
    if (matchingSnapshot && matchingSnapshot.velocity > cluster.velocity) {
      cluster.velocity = matchingSnapshot.velocity;
    }
  }

  const upcomingEvents = getUpcomingCalendarEvents(context.topics);

  const opportunities = await analyzeWhiteSpace(
    context,
    topicClusters,
    upcomingEvents,
    rawItems
  );

  opportunities.sort((a, b) => b.score - a.score);

  // Collect unique source names that were analysed
  const sourceNames = [...new Set(rawItems.map((item) => item.source.name))];

  return {
    opportunities,
    metadata: {
      clientName: context.name,
      rawItemsAnalyzed: rawItems.length,
      sourcesScanned: sourceNames,
      topicClustersFound: topicClusters.length,
      upcomingCalendarEvents: upcomingEvents.length,
      trendSnapshotsUsed: trendSnapshots.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
