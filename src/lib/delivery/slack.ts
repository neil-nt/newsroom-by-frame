/**
 * Slack webhook notifications for breaking alerts.
 *
 * Set SLACK_WEBHOOK_URL in .env to enable.
 */

interface AlertPayload {
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
}

const URGENCY_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const TYPE_LABEL: Record<string, string> = {
  breaking: "Breaking News Alert",
  trending: "Trending Topic",
  whitespace: "White Space Opportunity",
  speaker: "Speaker Opportunity",
};

function buildSlackBlocks(alert: AlertPayload) {
  const emoji = URGENCY_EMOJI[alert.urgency] || "⚪";
  const typeLabel = TYPE_LABEL[alert.type] || alert.type;

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${typeLabel}: ${alert.title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary:* ${alert.summary}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Why it matters:* ${alert.whyItMatters}`,
      },
    },
  ];

  if (alert.draftResponse) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Draft response:*\n>${alert.draftResponse.replace(/\n/g, "\n>")}`,
      },
    });
  }

  const metaParts: string[] = [];
  if (alert.spokesperson) metaParts.push(`*Spokesperson:* ${alert.spokesperson}`);
  if (alert.category) metaParts.push(`*Category:* ${alert.category}`);
  if (alert.confidence) metaParts.push(`*Confidence:* ${Math.round(alert.confidence * 100)}%`);

  if (metaParts.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: metaParts.join("  |  ") }],
    });
  }

  if (alert.sourceUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Source", emoji: true },
          url: alert.sourceUrl,
          action_id: "view_source",
        },
      ],
    });
  }

  return blocks;
}

/**
 * Send an alert to Slack via incoming webhook.
 * Returns true if successful, false if webhook not configured.
 */
export async function sendSlackAlert(alert: AlertPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("Slack webhook not configured, skipping notification");
    return false;
  }

  const blocks = buildSlackBlocks(alert);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `${TYPE_LABEL[alert.type] || alert.type}: ${alert.title}`,
      blocks,
    }),
  });

  if (!response.ok) {
    console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    return false;
  }

  return true;
}

/**
 * Send breaking/critical alerts to Slack immediately.
 * Only sends if urgency is critical or high + type is breaking.
 */
export async function notifyIfBreaking(alert: AlertPayload): Promise<boolean> {
  if (alert.urgency === "critical" || (alert.urgency === "high" && alert.type === "breaking")) {
    return sendSlackAlert(alert);
  }
  return false;
}
