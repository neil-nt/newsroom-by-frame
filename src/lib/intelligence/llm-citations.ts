import Anthropic from "@anthropic-ai/sdk";
import { loadClientContext } from "@/lib/intelligence/context";

const anthropic = new Anthropic();

export interface BrandCitation {
  query: string;
  category: string;
  brandMentioned: boolean;
  mentionContext: string | null; // how the brand was described
  sentiment: "positive" | "neutral" | "negative" | null;
  position: number | null; // 1st, 2nd, 3rd mentioned etc
  competitorsMentioned: string[];
  // Per-model tracking
  claudeMentioned: boolean;
  perplexityMentioned: boolean;
  perplexityContext: string | null;
  // Per-model raw context for side-by-side view
  claudeContext: string | null;
  claudeSentiment: "positive" | "neutral" | "negative" | null;
  perplexitySentiment: "positive" | "neutral" | "negative" | null;
  // Source URLs extracted from Perplexity responses
  sourceUrls: string[];
  // Historical tracking
  previousBrandMentioned?: boolean | null;
  trend?: "up" | "down" | "same" | "new" | null;
  // Whether this is a custom (ad-hoc) query
  isCustom?: boolean;
}

export interface CitationReport {
  clientName: string;
  overallVisibility: number; // 0-100 score
  claudeVisibility: number;
  perplexityVisibility: number;
  citations: BrandCitation[];
  competitorComparison: { name: string; visibility: number; claudeVisibility: number; perplexityVisibility: number }[];
  recommendations: string[];
  generatedAt: string;
  // Store previous results for trend tracking
  previousCitations?: { query: string; brandMentioned: boolean }[];
}

export interface QueryDefinition {
  query: string;
  category: string;
}

export const QUERY_CATEGORIES = [
  "Brand Awareness",
  "Industry Leadership",
  "Product/Service",
  "Competitor Comparison",
] as const;

export const INDUSTRY_QUERIES: QueryDefinition[] = [
  { query: "What are the best business water suppliers in the UK?", category: "Brand Awareness" },
  { query: "Who is the largest independent water retailer in the UK?", category: "Brand Awareness" },
  { query: "How do I switch my business water supplier?", category: "Product/Service" },
  { query: "What companies offer business water services in the UK?", category: "Brand Awareness" },
  { query: "Who are the main competitors in the UK business water market?", category: "Competitor Comparison" },
  { query: "What is Castle Water known for?", category: "Brand Awareness" },
  { query: "Which water company has the best customer service for businesses?", category: "Industry Leadership" },
  { query: "What should businesses consider when choosing a water supplier?", category: "Product/Service" },
  { query: "Who are the key players in the UK non-household water market?", category: "Industry Leadership" },
  { query: "What is happening with water regulation in the UK?", category: "Industry Leadership" },
];

interface PerplexityResponse {
  content: string;
  sourceUrls: string[];
}

async function queryPerplexity(query: string): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { content: "", sourceUrls: [] };

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: query }],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return { content: "", sourceUrls: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract source URLs — Perplexity returns citations in the response
    const sourceUrls: string[] = [];

    // Check for citations array in the response (Perplexity API format)
    if (data.citations && Array.isArray(data.citations)) {
      sourceUrls.push(...data.citations);
    }

    // Also extract any URLs from the content text itself
    const urlRegex = /https?:\/\/[^\s\])"',<>]+/g;
    const contentUrls = content.match(urlRegex) || [];
    for (const url of contentUrls) {
      // Clean trailing punctuation
      const cleanUrl = url.replace(/[.)]+$/, "");
      if (!sourceUrls.includes(cleanUrl)) {
        sourceUrls.push(cleanUrl);
      }
    }

    return { content, sourceUrls };
  } catch (error) {
    console.error("Perplexity query failed:", error);
    return { content: "", sourceUrls: [] };
  }
}

async function queryClaude(query: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: query }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

function analyseMentions(
  text: string,
  clientName: string,
  allBrands: string[],
  competitorNames: string[]
): {
  mentioned: boolean;
  context: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  position: number | null;
  competitorsMentioned: string[];
} {
  const textLower = text.toLowerCase();
  const mentioned = textLower.includes(clientName.toLowerCase());

  let position: number | null = null;
  if (mentioned) {
    const positions = allBrands
      .filter(b => textLower.includes(b.toLowerCase()))
      .map(b => ({ name: b, pos: textLower.indexOf(b.toLowerCase()) }))
      .sort((a, b) => a.pos - b.pos);
    const idx = positions.findIndex(p => p.name === clientName);
    if (idx >= 0) position = idx + 1;
  }

  let context: string | null = null;
  if (mentioned) {
    const sentences = text.split(/[.!?]+/);
    const mentionSentence = sentences.find(s =>
      s.toLowerCase().includes(clientName.toLowerCase())
    );
    if (mentionSentence) context = mentionSentence.trim();
  }

  const competitorsMentioned = competitorNames.filter(c =>
    textLower.includes(c.toLowerCase())
  );

  let sentiment: "positive" | "neutral" | "negative" | null = null;
  if (context) {
    const positive = /leading|largest|best|top|excellent|strong|trusted|reliable|innovative/i;
    const negative = /poor|worst|complaints|issues|problems|struggling/i;
    if (positive.test(context)) sentiment = "positive";
    else if (negative.test(context)) sentiment = "negative";
    else sentiment = "neutral";
  }

  return { mentioned, context, sentiment, position, competitorsMentioned };
}

/**
 * Process a single query against both models.
 * Used by both full analysis and custom query endpoint.
 */
export async function runSingleQuery(
  query: string,
  category: string,
  clientName: string,
  competitorNames: string[],
  allBrands: string[],
  previousMentioned?: boolean | null,
  isCustom?: boolean
): Promise<BrandCitation> {
  try {
    const [claudeText, perplexityResponse] = await Promise.all([
      queryClaude(query),
      queryPerplexity(query),
    ]);

    const claudeResult = analyseMentions(claudeText, clientName, allBrands, competitorNames);
    const perplexityResult = analyseMentions(perplexityResponse.content, clientName, allBrands, competitorNames);

    const brandMentioned = claudeResult.mentioned || perplexityResult.mentioned;
    const mentionContext = claudeResult.context || perplexityResult.context;
    const sentiment = claudeResult.sentiment || perplexityResult.sentiment;
    const position = claudeResult.position || perplexityResult.position;

    const competitorsMentioned = [...new Set([
      ...claudeResult.competitorsMentioned,
      ...perplexityResult.competitorsMentioned,
    ])];

    // Determine trend
    let trend: "up" | "down" | "same" | "new" | null = null;
    if (previousMentioned === undefined || previousMentioned === null) {
      trend = "new";
    } else if (previousMentioned && brandMentioned) {
      trend = "same";
    } else if (!previousMentioned && brandMentioned) {
      trend = "up";
    } else if (previousMentioned && !brandMentioned) {
      trend = "down";
    } else {
      trend = "same";
    }

    return {
      query,
      category,
      brandMentioned,
      mentionContext,
      sentiment,
      position,
      competitorsMentioned,
      claudeMentioned: claudeResult.mentioned,
      perplexityMentioned: perplexityResult.mentioned,
      perplexityContext: perplexityResult.context,
      claudeContext: claudeResult.context,
      claudeSentiment: claudeResult.sentiment,
      perplexitySentiment: perplexityResult.sentiment,
      sourceUrls: perplexityResponse.sourceUrls,
      previousBrandMentioned: previousMentioned ?? null,
      trend,
      isCustom: isCustom || false,
    };
  } catch (error) {
    console.error(`Citation query failed: ${query}`, error);
    return {
      query,
      category,
      brandMentioned: false,
      mentionContext: null,
      sentiment: null,
      position: null,
      competitorsMentioned: [],
      claudeMentioned: false,
      perplexityMentioned: false,
      perplexityContext: null,
      claudeContext: null,
      claudeSentiment: null,
      perplexitySentiment: null,
      sourceUrls: [],
      previousBrandMentioned: previousMentioned ?? null,
      trend: "new",
      isCustom: isCustom || false,
    };
  }
}

export async function runCitationAnalysis(
  clientId: string,
  previousCitations?: { query: string; brandMentioned: boolean }[]
): Promise<CitationReport> {
  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client context not found");

  const clientName = context.name;
  const competitorNames = context.competitors.map(c => c.name);
  const allBrands = [clientName, ...competitorNames];

  const citations: BrandCitation[] = [];

  // Build a map of previous results for trend tracking
  const prevMap = new Map<string, boolean>();
  if (previousCitations) {
    for (const pc of previousCitations) {
      prevMap.set(pc.query, pc.brandMentioned);
    }
  }

  // Query both Claude and Perplexity for each industry question
  for (const qDef of INDUSTRY_QUERIES) {
    const prevMentioned = prevMap.has(qDef.query) ? prevMap.get(qDef.query) : null;
    const citation = await runSingleQuery(
      qDef.query,
      qDef.category,
      clientName,
      competitorNames,
      allBrands,
      prevMentioned,
      false
    );
    citations.push(citation);

    // Delay between iterations to respect rate limits (300ms for Perplexity)
    await new Promise(r => setTimeout(r, 300));
  }

  // Calculate visibility scores
  const totalQueries = citations.length;
  const clientMentions = citations.filter(c => c.brandMentioned).length;
  const claudeMentions = citations.filter(c => c.claudeMentioned).length;
  const perplexityMentions = citations.filter(c => c.perplexityMentioned).length;
  const overallVisibility = Math.round((clientMentions / totalQueries) * 100);
  const claudeVisibility = Math.round((claudeMentions / totalQueries) * 100);
  const perplexityVisibility = Math.round((perplexityMentions / totalQueries) * 100);

  // Competitor visibility comparison (per-model)
  const competitorComparison = competitorNames.map(name => {
    const mentions = citations.filter(c =>
      c.competitorsMentioned.includes(name)
    ).length;
    const claudeCompMentions = citations.filter(c => {
      return c.competitorsMentioned.includes(name);
    }).length;

    return {
      name,
      visibility: Math.round((mentions / totalQueries) * 100),
      claudeVisibility: Math.round((claudeCompMentions / totalQueries) * 100),
      perplexityVisibility: Math.round((claudeCompMentions / totalQueries) * 100),
    };
  });

  // Generate recommendations using Claude
  const recommendations = await generateRecommendations(
    clientName,
    overallVisibility,
    claudeVisibility,
    perplexityVisibility,
    citations,
    competitorComparison
  );

  // Store current citation results for future trend tracking
  const currentCitationsForHistory = citations.map(c => ({
    query: c.query,
    brandMentioned: c.brandMentioned,
  }));

  return {
    clientName,
    overallVisibility,
    claudeVisibility,
    perplexityVisibility,
    citations,
    competitorComparison,
    recommendations,
    generatedAt: new Date().toISOString(),
    previousCitations: currentCitationsForHistory,
  };
}

/**
 * Run a single custom query for a given client.
 * Returns the citation result and the client metadata needed.
 */
export async function runCustomQuery(
  clientId: string,
  query: string,
  category: string
): Promise<{ citation: BrandCitation; clientName: string }> {
  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client context not found");

  const clientName = context.name;
  const competitorNames = context.competitors.map(c => c.name);
  const allBrands = [clientName, ...competitorNames];

  const citation = await runSingleQuery(
    query,
    category,
    clientName,
    competitorNames,
    allBrands,
    null,
    true
  );

  return { citation, clientName };
}

async function generateRecommendations(
  clientName: string,
  visibility: number,
  claudeVis: number,
  perplexityVis: number,
  citations: BrandCitation[],
  competitors: { name: string; visibility: number; claudeVisibility: number; perplexityVisibility: number }[]
): Promise<string[]> {
  const missedQueries = citations
    .filter(c => !c.brandMentioned)
    .map(c => c.query);

  const topCompetitor = competitors.sort((a, b) => b.visibility - a.visibility)[0];

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `You are a PR intelligence analyst. ${clientName} has ${visibility}% overall AI visibility (Claude: ${claudeVis}%, Perplexity: ${perplexityVis}%) — mentioned in ${visibility}% of relevant industry queries to AI assistants.

Their top competitor ${topCompetitor?.name || "N/A"} has ${topCompetitor?.visibility || 0}% visibility.

Queries where ${clientName} was NOT mentioned:
${missedQueries.map(q => `- "${q}"`).join("\n")}

Give exactly 4 short, actionable recommendations (1 sentence each) for improving ${clientName}'s AI visibility. Focus on content strategy that would influence how AI models represent the brand. Return as a JSON array of strings.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // Fallback recommendations
  }

  return [
    `Publish authoritative content addressing queries where ${clientName} is absent from AI responses.`,
    "Increase structured data and schema markup on the company website to improve AI model training data.",
    "Seek more third-party mentions in industry publications that AI models are trained on.",
    "Create comprehensive FAQ content that directly answers common industry questions.",
  ];
}
