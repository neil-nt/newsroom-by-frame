import { prisma } from "@/lib/db/client";

export interface SpikeForecast {
  alertId: string;
  topic: string;
  currentVelocity: number; // mentions in last 6 hours
  priorVelocity: number; // mentions in prior 6 hours
  acceleration: number; // ratio
  sourceSpread: number; // number of distinct sources covering it
  prediction: "escalating" | "steady" | "fading";
  confidence: number; // 0-1
}

export async function forecastSpike(
  clientId: string,
  topic: string
): Promise<SpikeForecast | null> {
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  // Get recent items matching the topic
  const recentItems = await prisma.rawItem.findMany({
    where: {
      source: { clientId },
      createdAt: { gte: twelveHoursAgo },
    },
    select: {
      title: true,
      content: true,
      createdAt: true,
      source: { select: { name: true } },
    },
  });

  const topicLower = topic.toLowerCase();
  const matchingItems = recentItems.filter((item) => {
    const text = `${item.title} ${item.content || ""}`.toLowerCase();
    return text.includes(topicLower);
  });

  if (matchingItems.length === 0) return null;

  const recentCount = matchingItems.filter(
    (i) => i.createdAt >= sixHoursAgo
  ).length;
  const priorCount = matchingItems.filter(
    (i) => i.createdAt < sixHoursAgo
  ).length;
  const priorAdjusted = Math.max(priorCount, 1);
  const acceleration = recentCount / priorAdjusted;

  // Source spread — how many distinct sources are covering it
  const recentSources = new Set(
    matchingItems
      .filter((i) => i.createdAt >= sixHoursAgo)
      .map((i) => i.source.name)
  );
  const sourceSpread = recentSources.size;

  // Prediction logic
  let prediction: "escalating" | "steady" | "fading";
  let confidence: number;

  if (acceleration > 2 && sourceSpread >= 3) {
    prediction = "escalating";
    confidence = Math.min(
      0.9,
      0.5 + (acceleration - 2) * 0.1 + sourceSpread * 0.05
    );
  } else if (acceleration > 1.3 || sourceSpread >= 2) {
    prediction = "steady";
    confidence = 0.5 + Math.min(0.3, (acceleration - 1) * 0.15);
  } else {
    prediction = "fading";
    confidence = 0.4 + Math.min(0.4, (1 - acceleration) * 0.5);
  }

  return {
    alertId: "",
    topic,
    currentVelocity: recentCount,
    priorVelocity: priorCount,
    acceleration,
    sourceSpread,
    prediction,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Run spike forecast for all active alert topics.
 */
export async function forecastAllSpikes(
  clientId: string
): Promise<SpikeForecast[]> {
  const alerts = await prisma.alert.findMany({
    where: {
      clientId,
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const forecasts: SpikeForecast[] = [];
  const seenTopics = new Set<string>();

  for (const alert of alerts) {
    const topic =
      alert.category || alert.title.split(/[:\-\u2013]/)[0].trim();
    if (seenTopics.has(topic.toLowerCase())) continue;
    seenTopics.add(topic.toLowerCase());

    const forecast = await forecastSpike(clientId, topic);
    if (forecast) {
      forecast.alertId = alert.id;
      forecasts.push(forecast);
    }
  }

  return forecasts.sort((a, b) => b.acceleration - a.acceleration);
}
