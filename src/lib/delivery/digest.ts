/**
 * Digest orchestrator — pulls alerts from the database and
 * sends them via the appropriate channel.
 */

import { prisma } from "@/lib/db/client";
import { generateDigestHtml, generateExecutiveDigestHtml, sendDigestEmail } from "./email";
import { calculateShareOfVoice } from "@/lib/intelligence/share-of-voice";

interface DigestConfig {
  clientId: string;
  period: "daily" | "weekly";
  recipients: string[];
  executive?: boolean;
}

/**
 * Build and send a digest for a client.
 * Pulls all alerts since the last digest period.
 * If executive mode is enabled, includes white space opportunities and share of voice data.
 */
export async function buildAndSendDigest(config: DigestConfig): Promise<{
  alertCount: number;
  sent: boolean;
}> {
  const { clientId, period, recipients, executive = true } = config;

  // Calculate the time window
  const now = new Date();
  const since = new Date(now);
  if (period === "daily") {
    since.setDate(since.getDate() - 1);
  } else {
    since.setDate(since.getDate() - 7);
  }

  // Fetch client info
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  });

  if (!client) {
    console.error(`Client ${clientId} not found`);
    return { alertCount: 0, sent: false };
  }

  // Fetch alerts for the period
  const alerts = await prisma.alert.findMany({
    where: {
      clientId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });

  if (alerts.length === 0) {
    console.log(`No alerts for ${client.name} in ${period} period`);
    return { alertCount: 0, sent: false };
  }

  // Parse JSON fields for the digest
  const digestAlerts = alerts.map((a) => ({
    id: a.id,
    type: a.type,
    urgency: a.urgency,
    title: a.title,
    summary: a.summary,
    whyItMatters: a.whyItMatters,
    draftResponse: a.draftResponse,
    spokesperson: a.spokesperson,
    sourceUrl: a.sourceUrl,
    confidence: a.confidence,
    category: a.category,
    createdAt: a.createdAt,
  }));

  let html: string;

  if (executive) {
    // Fetch white space opportunities from the most recent radar run
    let whiteSpaceOpportunities: {
      topic: string;
      opportunity: string;
      suggestedHeadline: string;
      score: number;
      timing: string;
    }[] = [];

    try {
      const latestRun = await prisma.whiteSpaceRun.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: {
          opportunities: {
            orderBy: { score: "desc" },
            take: 3,
            where: { status: { in: ["new", "reviewed"] } },
          },
        },
      });

      if (latestRun && latestRun.opportunities.length > 0) {
        whiteSpaceOpportunities = latestRun.opportunities.map((opp) => ({
          topic: opp.topic,
          opportunity: opp.opportunity,
          suggestedHeadline: opp.suggestedHeadline,
          score: opp.score,
          timing: opp.timing,
        }));
      }
    } catch (err) {
      console.warn("Could not fetch white space data for digest:", err);
    }

    // Fetch share of voice data
    let shareOfVoice: {
      clientBrand: { name: string; mentions: number; share: number };
      topCompetitor?: { name: string; mentions: number; share: number };
      totalMentions: number;
    } | null = null;

    try {
      const periodDays = period === "daily" ? 7 : 30;
      const sovData = await calculateShareOfVoice(clientId, periodDays);

      if (sovData.totalMentions > 0 && sovData.brands.length > 0) {
        const clientBrand = sovData.brands[0]; // Client is always first
        const topCompetitor = sovData.brands.length > 1 ? sovData.brands[1] : undefined;

        shareOfVoice = {
          clientBrand: {
            name: clientBrand.name,
            mentions: clientBrand.mentions,
            share: clientBrand.share,
          },
          topCompetitor: topCompetitor
            ? {
                name: topCompetitor.name,
                mentions: topCompetitor.mentions,
                share: topCompetitor.share,
              }
            : undefined,
          totalMentions: sovData.totalMentions,
        };
      }
    } catch (err) {
      console.warn("Could not fetch share of voice data for digest:", err);
    }

    // Generate recommendations based on the data
    const recommendations = generateRecommendations(digestAlerts, whiteSpaceOpportunities, shareOfVoice);

    html = generateExecutiveDigestHtml({
      clientName: client.name,
      period,
      alerts: digestAlerts,
      whiteSpaceOpportunities,
      shareOfVoice,
      recommendations,
    });
  } else {
    html = generateDigestHtml({
      clientName: client.name,
      period,
      alerts: digestAlerts,
    });
  }

  const periodLabel = period === "daily" ? "Daily" : "Weekly";
  const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const subject = `${periodLabel} Executive Digest — ${client.name} — ${dateStr}`;

  const sent = await sendDigestEmail(recipients, subject, html);

  return { alertCount: alerts.length, sent };
}

/**
 * Generate simple recommendations based on digest data.
 */
function generateRecommendations(
  alerts: { type: string; urgency: string; title: string }[],
  whiteSpaceOpps: { topic: string; score: number }[],
  sov: { clientBrand: { share: number }; topCompetitor?: { name: string; share: number } } | null
): string[] {
  const recs: string[] = [];

  const criticalAlerts = alerts.filter(a => a.urgency === "critical" || a.urgency === "high");
  if (criticalAlerts.length > 0) {
    recs.push(`Prioritise response to ${criticalAlerts.length} high-urgency alert${criticalAlerts.length > 1 ? "s" : ""} — the most pressing is "${criticalAlerts[0].title}".`);
  }

  if (whiteSpaceOpps.length > 0) {
    const topOpp = whiteSpaceOpps[0];
    recs.push(`Pursue the "${topOpp.topic}" white space opportunity (${Math.round(topOpp.score * 100)}% score) while competition remains low.`);
  }

  if (sov) {
    if (sov.topCompetitor && sov.topCompetitor.share > sov.clientBrand.share) {
      recs.push(`${sov.topCompetitor.name} currently leads share of voice — consider increasing proactive media activity to close the gap.`);
    } else if (sov.clientBrand.share > 50) {
      recs.push(`Strong share of voice position at ${sov.clientBrand.share}% — maintain momentum with consistent commentary.`);
    }
  }

  const breakingAlerts = alerts.filter(a => a.type === "breaking");
  if (breakingAlerts.length >= 3) {
    recs.push(`${breakingAlerts.length} breaking news items detected — brief spokesperson and prepare reactive statements.`);
  }

  return recs;
}
