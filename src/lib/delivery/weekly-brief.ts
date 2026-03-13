import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";
import { calculateShareOfVoice } from "@/lib/intelligence/share-of-voice";

const anthropic = new Anthropic();

export type BriefSection =
  | "summary"
  | "metrics"
  | "alerts"
  | "sov"
  | "whitespace"
  | "journalists"
  | "recommendations";

export const ALL_SECTIONS: BriefSection[] = [
  "summary",
  "metrics",
  "alerts",
  "sov",
  "whitespace",
  "journalists",
  "recommendations",
];

export async function generateWeeklyBrief(
  clientId: string,
  sections?: BriefSection[],
): Promise<{ html: string; subject: string }> {
  const activeSections = sections ?? ALL_SECTIONS;

  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client not found");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Gather data
  const alerts = await prisma.alert.findMany({
    where: { clientId, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const sov = await calculateShareOfVoice(clientId, 7);

  const latestRun = await prisma.whiteSpaceRun.findFirst({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { opportunities: { take: 3, orderBy: { score: "desc" } } },
  });

  const journalists = await prisma.journalist.findMany({
    where: { lastSeenAt: { gte: sevenDaysAgo } },
    orderBy: { articleCount: "desc" },
    take: 5,
  });

  const breakingCount = alerts.filter(a => a.type === "breaking").length;
  const trendingCount = alerts.filter(a => a.type === "trending").length;

  // Get Claude to write the executive summary and recommendations
  const aiResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `You are writing the executive summary for a weekly PR intelligence brief for ${context.name}.

Data this week:
- ${alerts.length} total alerts (${breakingCount} breaking, ${trendingCount} trending)
- SOV: ${sov.brands.map(b => `${b.name}: ${b.share}%`).join(", ")}
- ${latestRun?.opportunities.length || 0} white space opportunities identified
- Top alert: ${alerts[0]?.title || "None"}

Write two things as JSON. CRITICAL: Write like an experienced human PR consultant. Never use em dashes. Never use words like "landscape", "navigate", "leverage", "robust", "furthermore", "moreover". Use short, punchy sentences. Be specific and direct.
{
  "summary": "2-3 sentence executive summary of the week's media activity for this client",
  "recommendations": ["3-4 specific, actionable recommendations based on this week's data"]
}`,
    }],
  });

  let summary = "This week's media monitoring is summarised below.";
  let recommendations: string[] = ["Review the alerts below and action any requiring immediate attention."];

  try {
    const text = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      summary = parsed.summary || summary;
      recommendations = parsed.recommendations || recommendations;
    }
  } catch { /* use defaults */ }

  // Format dates
  const now = new Date();
  const dateRange = `${sevenDaysAgo.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

  // Build urgency badge color
  function urgencyColor(u: string): string {
    switch (u) {
      case "critical": return "#dc2626";
      case "high": return "#ea580c";
      case "medium": return "#d97706";
      default: return "#16a34a";
    }
  }

  // Build SOV rows (table-based for email)
  const maxMentions = Math.max(...sov.brands.map(b => b.mentions), 1);
  const sovRowsHtml = sov.brands.map(b => {
    const width = Math.max(Math.round((b.mentions / maxMentions) * 100), 2);
    const color = b.name === context.name ? "#7c3aed" : "#a1a1aa";
    const nameWeight = b.name === context.name ? "700" : "400";
    return `<tr>
      <td style="padding:6px 0;font-size:13px;font-weight:${nameWeight};color:#27272a;width:130px;">${b.name}</td>
      <td style="padding:6px 8px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="background:#f4f4f5;border-radius:4px;height:10px;">
            <table cellpadding="0" cellspacing="0" border="0" width="${width}%"><tr>
              <td style="background:${color};border-radius:4px;height:10px;line-height:10px;font-size:1px;">&nbsp;</td>
            </tr></table>
          </td>
        </tr></table>
      </td>
      <td style="padding:6px 0;font-size:13px;font-weight:600;color:#27272a;text-align:right;width:80px;white-space:nowrap;">${b.mentions} (${b.share}%)</td>
    </tr>`;
  }).join("");

  // Build alerts rows (simplified 2-col for email)
  const alertRowsHtml = alerts.slice(0, 7).map(a => {
    const badgeBg = urgencyColor(a.urgency);
    const dateStr = a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;vertical-align:top;width:24px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:${badgeBg};border-radius:3px;padding:2px 6px;font-size:9px;font-weight:700;text-transform:uppercase;color:white;white-space:nowrap;">${a.urgency}</td>
        </tr></table>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f4f4f5;vertical-align:top;">
        <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#18181b;">${a.title}</p>
        <p style="margin:0;font-size:12px;color:#71717a;line-height:1.4;">${a.summary.slice(0, 100)}${a.summary.length > 100 ? "..." : ""}</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;vertical-align:top;text-align:right;white-space:nowrap;width:60px;">
        <span style="font-size:11px;color:#a1a1aa;">${dateStr}</span>
      </td>
    </tr>`;
  }).join("");

  // White space opportunities (table-based)
  const wsOpps = latestRun?.opportunities || [];
  const whiteSpaceHtml = wsOpps.length > 0
    ? wsOpps.map(o => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#18181b;">${o.suggestedHeadline}</p>
          <p style="margin:0;font-size:12px;color:#71717a;line-height:1.4;">${o.opportunity}</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;vertical-align:top;text-align:right;width:50px;">
          <span style="font-size:13px;font-weight:700;color:#7c3aed;">${Math.round(o.score * 100)}%</span>
        </td>
      </tr>`).join("")
    : '<tr><td style="padding:16px 12px;color:#a1a1aa;font-size:13px;">No white space analysis run this week.</td></tr>';

  // Journalists (table-based)
  const journalistsHtml = journalists.length > 0
    ? journalists.map(j => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:13px;font-weight:500;color:#27272a;">${j.name}</td>
        <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:12px;color:#71717a;text-align:right;">${j.outlet || "—"}</td>
        <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:12px;color:#a1a1aa;text-align:right;width:70px;">${j.articleCount} articles</td>
      </tr>`).join("")
    : '<tr><td colspan="3" style="padding:16px 0;color:#a1a1aa;font-size:13px;">No journalist data available yet.</td></tr>';

  // Recommendations (table-based)
  const recsHtml = recommendations.map((r, i) => `<tr>
    <td style="padding:8px 12px 8px 0;vertical-align:top;width:28px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#ede9fe;border-radius:50%;width:24px;height:24px;text-align:center;font-size:12px;font-weight:700;color:#7c3aed;line-height:24px;">${i + 1}</td>
      </tr></table>
    </td>
    <td style="padding:8px 0;font-size:13px;color:#3f3f46;line-height:1.5;vertical-align:top;">${r}</td>
  </tr>`).join("");

  const clientBrand = sov.brands.find(b => b.name === context.name);

  // Divider helper
  const divider = `<tr><td style="padding:0 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #e4e4e7;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>`;

  // Build section HTML blocks keyed by section ID
  const sectionHtmlMap: Record<BriefSection, string> = {
    summary: `<!-- Executive Summary -->
        <tr><td style="padding:28px 32px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Executive Summary</p>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#3f3f46;">${summary}</p>
        </td></tr>`,

    metrics: `<!-- Key Metrics -->
        <tr><td style="padding:0 24px 24px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td width="25%" style="padding:4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="background:#f9fafb;border-radius:8px;padding:16px 8px;text-align:center;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#18181b;">${alerts.length}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Alerts</p>
                </td>
              </tr></table>
            </td>
            <td width="25%" style="padding:4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="background:#fef2f2;border-radius:8px;padding:16px 8px;text-align:center;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#dc2626;">${breakingCount}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Breaking</p>
                </td>
              </tr></table>
            </td>
            <td width="25%" style="padding:4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="background:#f5f3ff;border-radius:8px;padding:16px 8px;text-align:center;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#7c3aed;">${clientBrand?.share || 0}%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">SOV</p>
                </td>
              </tr></table>
            </td>
            <td width="25%" style="padding:4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="background:#f5f3ff;border-radius:8px;padding:16px 8px;text-align:center;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#7c3aed;">${wsOpps.length}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Opps</p>
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>`,

    alerts: `<!-- Top Alerts -->
        <tr><td style="padding:24px 32px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Top Alerts</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${alertRowsHtml || '<tr><td style="padding:16px 0;text-align:center;color:#a1a1aa;font-size:13px;">No alerts this week.</td></tr>'}
          </table>
        </td></tr>`,

    sov: `<!-- Share of Voice -->
        <tr><td style="padding:24px 32px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Share of Voice (7 days)</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${sovRowsHtml}
          </table>
        </td></tr>`,

    whitespace: `<!-- White Space Opportunities -->
        <tr><td style="padding:24px 32px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">White Space Opportunities</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${whiteSpaceHtml}
          </table>
        </td></tr>`,

    journalists: `<!-- Active Journalists -->
        <tr><td style="padding:24px 32px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Active Journalists</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${journalistsHtml}
          </table>
        </td></tr>`,

    recommendations: `<!-- Recommended Actions -->
        <tr><td style="padding:24px 32px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Recommended Actions</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${recsHtml}
          </table>
        </td></tr>`,
  };

  // Build body sections in requested order with dividers between them
  const bodyParts: string[] = [];
  for (const section of activeSections) {
    if (bodyParts.length > 0) {
      bodyParts.push(divider);
    }
    bodyParts.push(sectionHtmlMap[section]);
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#18181b;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Newsroom <span style="font-weight:400;color:#a1a1aa;">by Frame</span></p>
          <p style="margin:6px 0 0;color:#71717a;font-size:12px;">Weekly Intelligence Brief &middot; ${dateRange}</p>
        </td></tr>

        ${bodyParts.join("\n\n        ")}

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">Generated by Newsroom by Frame &middot; ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const subject = `${context.name} — Weekly Intelligence Brief (${dateRange})`;

  return { html, subject };
}

/**
 * Send the weekly brief email using Resend API or console logging.
 */
export async function sendWeeklyBrief(
  clientId: string,
  toEmail: string,
  sections?: BriefSection[],
): Promise<boolean> {
  const { html, subject } = await generateWeeklyBrief(clientId, sections);

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "newsroom@frame.agency";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend API error:", await res.text());
      return false;
    }
    return true;
  }

  // No Resend key — log to console
  console.log("=== WEEKLY BRIEF EMAIL ===");
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML length: ${html.length} characters`);
  console.log("========================");

  return true;
}
