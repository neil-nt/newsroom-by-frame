import { prisma } from "@/lib/db/client";
import type { ClientContextForAnalysis } from "./analyzer";

/**
 * Load full client context from database, structured for the analyzer.
 */
export async function loadClientContext(
  clientId: string
): Promise<ClientContextForAnalysis | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      context: true,
      spokespeople: { where: { active: true } },
      competitors: true,
      topics: true,
    },
  });

  if (!client || !client.context) return null;

  const ctx = client.context;

  return {
    name: client.name,
    positioning: ctx.positioning,
    messagePillars: JSON.parse(ctx.messagePillars),
    toneOfVoice: ctx.toneOfVoice,
    toneExamples: JSON.parse(ctx.toneExamples),
    avoidTopics: JSON.parse(ctx.avoidTopics),
    dataPoints: JSON.parse(ctx.dataPoints),
    spokespeople: client.spokespeople.map((sp) => ({
      name: sp.name,
      role: sp.role,
      expertise: JSON.parse(sp.expertise),
      mediaStyle: sp.mediaStyle || undefined,
    })),
    competitors: client.competitors.map((c) => ({
      name: c.name,
      position: c.position,
      strengths: JSON.parse(c.strengths),
    })),
    topics: client.topics.map((t) => ({
      name: t.name,
      authority: t.authority,
      keywords: JSON.parse(t.keywords),
    })),
  };
}
