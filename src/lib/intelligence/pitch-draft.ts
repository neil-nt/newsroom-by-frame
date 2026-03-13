import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { loadClientContext } from "@/lib/intelligence/context";

const anthropic = new Anthropic();

export interface PitchDraft {
  subject: string;
  body: string;
  suggestedOutlets: string[];
  keyMessages: string[];
}

export async function generatePitch(
  alertId: string,
  clientId: string
): Promise<PitchDraft> {
  const context = await loadClientContext(clientId);
  if (!context) throw new Error("Client context not found");

  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
  });
  if (!alert) throw new Error("Alert not found");

  let targetMedia: string[] = [];
  try { targetMedia = alert.targetMedia ? JSON.parse(alert.targetMedia) : []; } catch {}

  let dataPoints: string[] = [];
  try { dataPoints = alert.dataPoints ? JSON.parse(alert.dataPoints) : []; } catch {}

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `You are a senior PR professional drafting a media pitch for ${context.name}.

## ALERT DETAILS
Title: ${alert.title}
Summary: ${alert.summary}
Why it matters: ${alert.whyItMatters}
Category: ${alert.category || "general"}
Urgency: ${alert.urgency}

## CLIENT CONTEXT
Positioning: ${context.positioning}
Tone of voice: ${context.toneOfVoice}
Spokesperson: ${alert.spokesperson || context.spokespeople[0]?.name || "TBC"}
Key data points: ${[...dataPoints, ...context.dataPoints.map(d => `${d.metric}: ${d.value}`)].join(", ")}
Message pillars: ${context.messagePillars.join("; ")}

## TASK
Draft a journalist pitch email. The pitch should:
1. Have a compelling subject line that a journalist would actually open
2. Open with why this matters NOW (the news hook)
3. Offer the spokesperson with a specific angle they can speak to
4. Include 1-2 data points that make the story concrete
5. Be concise — under 200 words for the body
6. Match the client's tone of voice
7. NOT be generic — reference the specific alert topic

## WRITING STYLE (CRITICAL)
Write like an experienced human PR professional, NOT like an AI. You MUST:
- NEVER use em dashes (—). Use commas, full stops, or restructure the sentence instead.
- NEVER use "Furthermore", "Moreover", "In addition", "It's worth noting", "Notably"
- NEVER use "landscape", "navigate", "leverage", "holistic", "robust", "cutting-edge"
- Avoid overly long compound sentences. Keep sentences short and punchy.
- Use contractions naturally (it's, we're, they've)
- Vary sentence length. Mix short declarative sentences with slightly longer ones.
- Sound like a real email from a real person, not a press release template.
- Be direct. Get to the point fast. Journalists are busy.

Respond with JSON only:
{
  "subject": "email subject line",
  "body": "the full pitch email body (use \\n for line breaks)",
  "suggestedOutlets": ["3-5 specific UK publications to send this to"],
  "keyMessages": ["3 bullet point key messages for the spokesperson to land"]
}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      subject: `${context.name} comment: ${alert.title}`,
      body: `Draft pitch for: ${alert.title}\n\n${alert.summary}`,
      suggestedOutlets: targetMedia.length > 0 ? targetMedia : ["Trade press"],
      keyMessages: [alert.whyItMatters],
    };
  }

  return JSON.parse(match[0]);
}
