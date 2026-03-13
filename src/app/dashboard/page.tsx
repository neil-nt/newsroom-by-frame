import { prisma } from "@/lib/db/client";
import { ClientOverview } from "./client-overview";
import { ClientDashboard } from "./client-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client;

  // No client param → show overview of all clients
  if (!clientId) {
    return <ClientOverview />;
  }

  // Client param present → show the full client dashboard
  const client = await prisma.client.findFirst({
    where: { id: clientId, active: true },
  });

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Client not found or inactive.
      </div>
    );
  }

  // Only show alerts from the last 30 days, sorted by publish date (or creation date)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const alerts = await prisma.alert.findMany({
    where: {
      clientId: client.id,
      OR: [
        { publishedAt: { gte: thirtyDaysAgo } },
        { publishedAt: null, createdAt: { gte: thirtyDaysAgo } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const sources = await prisma.source.findMany({
    where: { clientId: client.id, active: true },
    select: { name: true, type: true, lastFetchedAt: true },
  });

  return (
    <ClientDashboard
      client={client}
      alerts={alerts}
      sources={sources}
    />
  );
}
