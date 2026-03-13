import { prisma } from "@/lib/db/client";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {client.name} — Calendar
      </h1>
      <CalendarView clientName={client.name} />
    </div>
  );
}
