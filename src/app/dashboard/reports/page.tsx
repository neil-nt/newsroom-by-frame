import { prisma } from "@/lib/db/client";
import { ReportBuilder } from "./report-builder";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client;

  const client = clientId
    ? await prisma.client.findFirst({ where: { id: clientId, active: true } })
    : await prisma.client.findFirst({ where: { active: true } });

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        No active clients found. Run the seed script first.
      </div>
    );
  }

  return <ReportBuilder clientId={client.id} clientName={client.name} />;
}
