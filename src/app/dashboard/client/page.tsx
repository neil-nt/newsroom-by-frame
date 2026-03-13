import { prisma } from "@/lib/db/client";
import { ClientProfile } from "./client-profile";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client;

  const client = clientId
    ? await prisma.client.findFirst({
        where: { id: clientId, active: true },
        include: {
          context: true,
          spokespeople: { orderBy: { name: "asc" } },
          competitors: { orderBy: { name: "asc" } },
          topics: { orderBy: { name: "asc" } },
          sources: { orderBy: { name: "asc" } },
        },
      })
    : await prisma.client.findFirst({
        where: { active: true },
        include: {
          context: true,
          spokespeople: { orderBy: { name: "asc" } },
          competitors: { orderBy: { name: "asc" } },
          topics: { orderBy: { name: "asc" } },
          sources: { orderBy: { name: "asc" } },
        },
      });

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        No active clients found. Run the seed script first.
      </div>
    );
  }

  return <ClientProfile client={client} />;
}
