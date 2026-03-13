/**
 * Email digest generation.
 *
 * Generates HTML email digests from alerts.
 * Sending is via any SMTP or API service — we generate the HTML here
 * and provide a send function that uses Resend (or logs to console if unconfigured).
 */

interface DigestAlert {
  id: string;
  type: string;
  urgency: string;
  title: string;
  summary: string;
  whyItMatters: string;
  draftResponse?: string | null;
  spokesperson?: string | null;
  sourceUrl?: string | null;
  confidence?: number | null;
  category?: string | null;
  createdAt: Date;
}

interface WhiteSpaceOpportunity {
  topic: string;
  opportunity: string;
  suggestedHeadline: string;
  score: number;
  timing: string;
}

interface SovBrand {
  name: string;
  mentions: number;
  share: number;
}

interface DigestOptions {
  clientName: string;
  period: "daily" | "weekly";
  alerts: DigestAlert[];
}

interface ExecutiveDigestOptions {
  clientName: string;
  period: "daily" | "weekly";
  alerts: DigestAlert[];
  whiteSpaceOpportunities?: WhiteSpaceOpportunity[];
  shareOfVoice?: {
    clientBrand: SovBrand;
    topCompetitor?: SovBrand;
    totalMentions: number;
  } | null;
  recommendations?: string[];
}

const URGENCY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const URGENCY_BG: Record<string, string> = {
  critical: "#fef2f2",
  high: "#fff7ed",
  medium: "#fefce8",
  low: "#f0fdf4",
};

const TYPE_LABEL: Record<string, string> = {
  breaking: "Breaking News",
  trending: "Trending Topic",
  whitespace: "White Space Opportunity",
  speaker: "Speaker Opportunity",
};

function groupAlertsByType(alerts: DigestAlert[]): Record<string, DigestAlert[]> {
  const groups: Record<string, DigestAlert[]> = {};
  for (const alert of alerts) {
    if (!groups[alert.type]) groups[alert.type] = [];
    groups[alert.type].push(alert);
  }
  return groups;
}

/**
 * Generate a basic HTML email digest from alerts (legacy).
 */
export function generateDigestHtml(options: DigestOptions): string {
  const { clientName, period, alerts } = options;
  const grouped = groupAlertsByType(alerts);
  const periodLabel = period === "daily" ? "Daily" : "Weekly";
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let alertSections = "";

  for (const [type, typeAlerts] of Object.entries(grouped)) {
    const label = TYPE_LABEL[type] || type;
    const sortedAlerts = typeAlerts.sort(
      (a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency)
    );

    alertSections += `
      <tr><td style="padding: 24px 0 8px 0;">
        <h2 style="margin: 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          ${label} (${typeAlerts.length})
        </h2>
      </td></tr>`;

    for (const alert of sortedAlerts) {
      const color = URGENCY_COLOR[alert.urgency] || "#6b7280";
      alertSections += `
      <tr><td style="padding: 12px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 4px solid ${color}; padding-left: 16px;">
          <tr><td>
            <span style="display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${color}; letter-spacing: 0.05em;">
              ${alert.urgency}
            </span>
            ${alert.confidence ? `<span style="font-size: 11px; color: #9ca3af; margin-left: 8px;">${Math.round(alert.confidence * 100)}% confidence</span>` : ""}
            <h3 style="margin: 4px 0 8px 0; font-size: 16px; color: #111827;">
              ${alert.sourceUrl ? `<a href="${alert.sourceUrl}" style="color: #111827; text-decoration: none;">${alert.title}</a>` : alert.title}
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; line-height: 1.5;">${alert.summary}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;"><strong>Why it matters:</strong> ${alert.whyItMatters}</p>
            ${alert.draftResponse ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563; background: #f9fafb; padding: 8px 12px; border-radius: 4px; line-height: 1.5;"><strong>Draft response:</strong> ${alert.draftResponse}</p>` : ""}
            ${alert.spokesperson ? `<p style="margin: 0; font-size: 12px; color: #9ca3af;">Spokesperson: ${alert.spokesperson}</p>` : ""}
          </td></tr>
        </table>
      </td></tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <tr><td style="background: #111827; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 600;">SF&amp;D Insights Engine</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">by Frame</p>
        </td></tr>

        <!-- Subheader -->
        <tr><td style="padding: 24px 32px 0 32px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">${periodLabel} Digest for <strong style="color: #111827;">${clientName}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">${dateStr} &mdash; ${alerts.length} alert${alerts.length !== 1 ? "s" : ""}</p>
        </td></tr>

        <!-- Alerts -->
        <tr><td style="padding: 0 32px 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${alertSections}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            SF&amp;D Insights Engine &mdash; Powered by Frame &mdash; Confidential
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Generate a polished, board-ready executive digest HTML email.
 */
export function generateExecutiveDigestHtml(options: ExecutiveDigestOptions): string {
  const { clientName, period, alerts, whiteSpaceOpportunities, shareOfVoice, recommendations } = options;
  const periodLabel = period === "daily" ? "Daily" : "Weekly";
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const breakingCount = alerts.filter(a => a.urgency === "critical" || a.urgency === "high").length;
  const opportunityCount = alerts.filter(a => a.type === "whitespace" || a.type === "speaker").length;

  // Top 3 alerts by urgency
  const topAlerts = [...alerts]
    .sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency))
    .slice(0, 3);

  // Build top alerts section
  let topAlertsHtml = "";
  for (const alert of topAlerts) {
    const color = URGENCY_COLOR[alert.urgency] || "#6b7280";
    const bg = URGENCY_BG[alert.urgency] || "#f9fafb";
    topAlertsHtml += `
      <tr><td style="padding: 10px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 6px; overflow: hidden;">
          <tr><td style="padding: 16px 20px; border-left: 4px solid ${color}; background: ${bg};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ffffff; background: ${color}; padding: 2px 8px; border-radius: 3px;">
                    ${alert.urgency}
                  </span>
                  ${alert.category ? `<span style="display: inline-block; font-size: 10px; color: #6b7280; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em;">${alert.category}</span>` : ""}
                </td>
              </tr>
              <tr><td style="padding-top: 8px;">
                <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827; line-height: 1.3;">
                  ${alert.sourceUrl ? `<a href="${alert.sourceUrl}" style="color: #111827; text-decoration: none;">${alert.title}</a>` : alert.title}
                </h3>
                <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">${alert.summary}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>`;
  }

  // White space section
  let whiteSpaceHtml = "";
  if (whiteSpaceOpportunities && whiteSpaceOpportunities.length > 0) {
    let oppRows = "";
    for (const opp of whiteSpaceOpportunities.slice(0, 3)) {
      const scoreColor = opp.score >= 0.8 ? "#16a34a" : opp.score >= 0.6 ? "#ca8a04" : "#6b7280";
      oppRows += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top;">
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #111827;">${opp.suggestedHeadline}</p>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; line-height: 1.4;">${opp.opportunity}</p>
                  <span style="display: inline-block; font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">${opp.timing}</span>
                </td>
                <td style="vertical-align: top; text-align: right; width: 60px;">
                  <span style="display: inline-block; font-size: 12px; font-weight: 700; color: ${scoreColor};">${Math.round(opp.score * 100)}%</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }

    whiteSpaceHtml = `
      <tr><td style="padding: 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 28px 0 12px 0;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
              White Space Opportunities
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">Proactive angles with low competition</p>
          </td></tr>
          ${oppRows}
        </table>
      </td></tr>`;
  }

  // Share of Voice section
  let sovHtml = "";
  if (shareOfVoice && shareOfVoice.clientBrand.mentions > 0) {
    const client = shareOfVoice.clientBrand;
    const competitor = shareOfVoice.topCompetitor;
    let competitorLine = "";
    if (competitor && competitor.mentions > 0) {
      competitorLine = `
        <tr><td style="padding: 8px 0 0 0;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            Top competitor: <strong style="color: #374151;">${competitor.name}</strong> &mdash; ${competitor.mentions} mention${competitor.mentions !== 1 ? "s" : ""} (${competitor.share}%)
          </p>
        </td></tr>`;
    }

    // Simple bar chart
    const clientWidth = Math.max(client.share, 5);
    const competitorWidth = competitor ? Math.max(competitor.share, 5) : 0;

    sovHtml = `
      <tr><td style="padding: 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 28px 0 12px 0;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
              Share of Voice
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">${shareOfVoice.totalMentions} total mentions tracked</p>
          </td></tr>
          <tr><td style="padding: 8px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;">
              <strong>${client.name}</strong>: ${client.mentions} mention${client.mentions !== 1 ? "s" : ""} (${client.share}%)
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; border-radius: 4px; overflow: hidden;">
              <tr><td style="width: ${clientWidth}%; background: #111827; height: 8px; border-radius: 4px;"></td><td></td></tr>
            </table>
          </td></tr>
          ${competitor ? `
          <tr><td style="padding: 8px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;">
              <strong>${competitor.name}</strong>: ${competitor.mentions} mention${competitor.mentions !== 1 ? "s" : ""} (${competitor.share}%)
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; border-radius: 4px; overflow: hidden;">
              <tr><td style="width: ${competitorWidth}%; background: #6b7280; height: 8px; border-radius: 4px;"></td><td></td></tr>
            </table>
          </td></tr>` : ""}
          ${competitorLine}
        </table>
      </td></tr>`;
  }

  // Recommendations section
  let recommendationsHtml = "";
  if (recommendations && recommendations.length > 0) {
    let recItems = "";
    for (const rec of recommendations) {
      recItems += `
        <tr><td style="padding: 6px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; padding-right: 10px; color: #111827; font-size: 14px; font-weight: 600;">&#8250;</td>
              <td style="font-size: 13px; color: #374151; line-height: 1.5;">${rec}</td>
            </tr>
          </table>
        </td></tr>`;
    }

    recommendationsHtml = `
      <tr><td style="padding: 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 28px 0 12px 0;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
              Recommendations
            </h2>
          </td></tr>
          ${recItems}
        </table>
      </td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodLabel} Executive Digest - ${clientName}</title>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 40px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background: #111827; padding: 32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 700; letter-spacing: -0.02em;">Newsroom</h1>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500;">by Frame</p>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span style="font-size: 11px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em;">${periodLabel} Digest</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Client + date bar -->
        <tr><td style="background: #f9fafb; padding: 16px 40px; border-bottom: 1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${clientName}</p>
              </td>
              <td style="text-align: right;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">${dateStr}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Executive Summary -->
        <tr><td style="padding: 32px 40px 0 40px;">
          <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
            Executive Summary
          </h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 20px; text-align: center; width: 33%;">
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${alerts.length}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Alert${alerts.length !== 1 ? "s" : ""}</p>
              </td>
              <td style="padding: 20px; text-align: center; width: 33%; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${breakingCount > 0 ? "#dc2626" : "#111827"};">${breakingCount}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Breaking</p>
              </td>
              <td style="padding: 20px; text-align: center; width: 33%;">
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${opportunityCount > 0 ? "#16a34a" : "#111827"};">${opportunityCount}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Opportunities</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Top Alerts -->
        <tr><td style="padding: 28px 40px 0 40px;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
            Priority Alerts
          </h2>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af;">Top ${topAlerts.length} by urgency</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${topAlertsHtml}
          </table>
        </td></tr>

        ${whiteSpaceHtml}

        ${sovHtml}

        ${recommendationsHtml}

        <!-- Spacer -->
        <tr><td style="padding: 16px 0;"></td></tr>

        <!-- Footer -->
        <tr><td style="background: #111827; padding: 24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 11px; color: #6b7280;">Generated by <strong style="color: #9ca3af;">Newsroom by Frame</strong></p>
              </td>
              <td style="text-align: right;">
                <p style="margin: 0; font-size: 10px; color: #4b5563;">Confidential</p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function urgencyRank(urgency: string): number {
  const ranks: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return ranks[urgency] ?? 4;
}

/**
 * Send digest email. Uses Resend if RESEND_API_KEY is set,
 * otherwise logs to console for development.
 */
export async function sendDigestEmail(
  to: string[],
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[Email] Would send to: ${to.join(", ")}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] HTML length: ${html.length} chars`);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Newsroom by Frame <insights@frame.agency>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send email: ${response.status} ${error}`);
    return false;
  }

  return true;
}
