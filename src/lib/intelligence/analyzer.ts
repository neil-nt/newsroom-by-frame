import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface ClientContextForAnalysis {
  name: string;
  positioning: string;
  messagePillars: string[];
  toneOfVoice: string;
  toneExamples: string[];
  avoidTopics: string[];
  dataPoints: Array<{ metric: string; value: string; context: string }>;
  spokespeople: Array<{
    name: string;
    role: string;
    expertise: string[];
    mediaStyle?: string;
  }>;
  competitors: Array<{
    name: string;
    position: string;
    strengths: string[];
  }>;
  topics: Array<{
    name: string;
    authority: string;
    keywords: string[];
  }>;
}

export interface RawSignal {
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  sourceType: string;
  sourceName: string;
}

export interface PreFilterResult {
  relevant: boolean;
  relevanceScore: number;
  reason: string;
}

export interface AnalysisResult {
  type: "breaking" | "trending" | "whitespace" | "speaker";
  urgency: "immediate" | "today" | "this_week" | "pipeline";
  title: string;
  summary: string;
  whyItMatters: string;
  draftResponse: string | null;
  spokesperson: string | null;
  targetMedia: string[];
  dataPoints: string[];
  confidence: number;
  category: string;
}

/**
 * Stage 1: Cheap pre-filter using Haiku.
 * Determines if a raw item is relevant to the client before full analysis.
 */
export async function preFilter(
  signal: RawSignal,
  context: ClientContextForAnalysis
): Promise<PreFilterResult> {
  const topicKeywords = context.topics
    .flatMap((t) => t.keywords)
    .join(", ");

  const competitorNames = context.competitors.map((c) => c.name).join(", ");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `You are a media relevance filter for ${context.name}, a UK business water retailer.

Determine if this item is relevant enough to warrant full analysis.

CLIENT TOPICS: ${topicKeywords}
COMPETITORS: ${competitorNames}
CLIENT POSITIONING: ${context.positioning}

ITEM:
Title: ${signal.title}
Content: ${signal.content?.slice(0, 500) || "No content"}
Source: ${signal.sourceName} (${signal.sourceType})

Respond in JSON only:
{"relevant": true/false, "relevanceScore": 0.0-1.0, "reason": "brief reason"}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON found in response: ${text}`);
    const result = JSON.parse(jsonMatch[0]);
    return {
      relevant: result.relevant,
      relevanceScore: result.relevanceScore,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Pre-filter parse error:", error);
    return { relevant: false, relevanceScore: 0, reason: "Parse error" };
  }
}

/**
 * Stage 2: Full analysis using Sonnet.
 * Generates actionable intelligence with draft responses.
 */
export async function analyzeSignal(
  signal: RawSignal,
  context: ClientContextForAnalysis
): Promise<AnalysisResult> {
  const dataPointsList = context.dataPoints
    .map((dp) => `- ${dp.metric}: ${dp.value} (${dp.context})`)
    .join("\n");

  const spokespeopleList = context.spokespeople
    .map(
      (sp) =>
        `- ${sp.name}, ${sp.role}: expertise in ${sp.expertise.join(", ")}`
    )
    .join("\n");

  const toneExamples = context.toneExamples
    .map((ex) => `"${ex}"`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are the intelligence engine for the SF&D Insights Engine, a media intelligence newsroom built for PR agency Frame.

Your job is to analyse a media signal and produce actionable intelligence for ${context.name}.

## CLIENT CONTEXT

**Positioning:** ${context.positioning}

**Message Pillars:**
${context.messagePillars.map((p) => `- ${p}`).join("\n")}

**Tone of Voice:** ${context.toneOfVoice}

**Example quotes (match this style for draft responses):**
${toneExamples}

**Key Data Points (use these in draft responses where relevant):**
${dataPointsList}

**Spokespeople:**
${spokespeopleList}

**Topics to Avoid:** ${context.avoidTopics.join(", ")}

## SIGNAL TO ANALYSE

Title: ${signal.title}
Content: ${signal.content || "No additional content"}
Source: ${signal.sourceName} (${signal.sourceType})
Published: ${signal.publishedAt?.toISOString() || "Unknown"}
URL: ${signal.url || "None"}

## INSTRUCTIONS

Analyse this signal and produce intelligence output. Respond in JSON only:

{
  "type": "breaking" | "trending" | "whitespace" | "speaker",
  "urgency": "immediate" | "today" | "this_week" | "pipeline",
  "title": "Concise headline for the alert (not the original title)",
  "summary": "2-3 sentences: what happened and why it's a signal",
  "whyItMatters": "2-3 sentences: why this matters specifically for ${context.name}, referencing their positioning",
  "draftResponse": "A 2-4 sentence draft media comment attributed to the recommended spokesperson. Match the client's tone of voice. Reference specific client data points where relevant. Make it quotable and ready to send to a journalist with minimal editing. Or null if no response is appropriate.",
  "spokesperson": "Name of recommended spokesperson or null",
  "targetMedia": ["List of 2-4 specific publications this could be pitched to"],
  "dataPoints": ["List of client data points relevant to reference"],
  "confidence": 0.0-1.0,
  "category": "Brief topic category"
}

IMPORTANT:
- The draft response should sound like ${context.spokespeople[0]?.name || "the CEO"}, not like a press release
- Reference specific numbers from the client's data points
- Be specific about WHY this matters for this client, not generic
- Target media should be real publications from the client's sector`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse analysis result", error);
    return {
      type: "breaking",
      urgency: "this_week",
      title: signal.title,
      summary: "Analysis failed -- manual review required",
      whyItMatters: "Unable to determine automatically",
      draftResponse: null,
      spokesperson: null,
      targetMedia: [],
      dataPoints: [],
      confidence: 0,
      category: "unknown",
    };
  }
}
