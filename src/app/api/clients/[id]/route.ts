import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// PATCH /api/clients/[id]
// Accepts partial updates by section.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { section } = body as { section: string };

    switch (section) {
      // ── Basics (client name, slug) ──────────────────────────
      case "basics": {
        const { name, slug } = body as { name: string; slug: string };
        const updated = await prisma.client.update({
          where: { id },
          data: { name, slug },
        });
        return NextResponse.json(updated);
      }

      // ── Context fields ──────────────────────────────────────
      case "context": {
        const {
          positioning,
          messagePillars,
          toneOfVoice,
          toneExamples,
          avoidTopics,
          dataPoints,
          responseTemplates,
        } = body as {
          positioning?: string;
          messagePillars?: string[];
          toneOfVoice?: string;
          toneExamples?: string[];
          avoidTopics?: string[];
          dataPoints?: { metric: string; value: string; context: string }[];
          responseTemplates?: string;
        };

        const data: Record<string, string> = {};
        if (positioning !== undefined) data.positioning = positioning;
        if (messagePillars !== undefined)
          data.messagePillars = JSON.stringify(messagePillars);
        if (toneOfVoice !== undefined) data.toneOfVoice = toneOfVoice;
        if (toneExamples !== undefined)
          data.toneExamples = JSON.stringify(toneExamples);
        if (avoidTopics !== undefined)
          data.avoidTopics = JSON.stringify(avoidTopics);
        if (dataPoints !== undefined)
          data.dataPoints = JSON.stringify(dataPoints);
        if (responseTemplates !== undefined)
          data.responseTemplates = responseTemplates;

        const updated = await prisma.clientContext.update({
          where: { clientId: id },
          data,
        });
        return NextResponse.json(updated);
      }

      // ── Brand keyword aliases ───────────────────────────────
      case "keywords": {
        const { aliases } = body as { aliases: string[] };
        const updated = await prisma.clientContext.update({
          where: { clientId: id },
          data: { brandAliases: JSON.stringify(aliases) },
        });
        return NextResponse.json(updated);
      }

      // ── Spokesperson CRUD ───────────────────────────────────
      case "spokesperson": {
        const { action, spokespersonId, data } = body as {
          action: "create" | "update" | "delete";
          spokespersonId?: string;
          data?: {
            name?: string;
            role?: string;
            expertise?: string[];
            mediaStyle?: string;
            bio?: string;
            active?: boolean;
          };
        };

        if (action === "create") {
          const created = await prisma.spokesperson.create({
            data: {
              clientId: id,
              name: data!.name!,
              role: data!.role!,
              expertise: JSON.stringify(data!.expertise ?? []),
              mediaStyle: data!.mediaStyle ?? null,
              bio: data!.bio ?? null,
              active: data!.active ?? true,
            },
          });
          return NextResponse.json(created);
        }

        if (action === "update") {
          const updateData: Record<string, unknown> = {};
          if (data!.name !== undefined) updateData.name = data!.name;
          if (data!.role !== undefined) updateData.role = data!.role;
          if (data!.expertise !== undefined)
            updateData.expertise = JSON.stringify(data!.expertise);
          if (data!.mediaStyle !== undefined)
            updateData.mediaStyle = data!.mediaStyle;
          if (data!.bio !== undefined) updateData.bio = data!.bio;
          if (data!.active !== undefined) updateData.active = data!.active;

          const updated = await prisma.spokesperson.update({
            where: { id: spokespersonId! },
            data: updateData,
          });
          return NextResponse.json(updated);
        }

        if (action === "delete") {
          await prisma.spokesperson.delete({
            where: { id: spokespersonId! },
          });
          return NextResponse.json({ deleted: true });
        }

        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }

      // ── Competitor CRUD ─────────────────────────────────────
      case "competitor": {
        const { action, competitorId, data } = body as {
          action: "create" | "update" | "delete";
          competitorId?: string;
          data?: {
            name?: string;
            position?: string;
            messaging?: string;
            strengths?: string[];
            weaknesses?: string[];
            trackUrls?: string;
          };
        };

        if (action === "create") {
          const created = await prisma.competitor.create({
            data: {
              clientId: id,
              name: data!.name!,
              position: data!.position ?? "",
              messaging: data!.messaging ?? "",
              strengths: JSON.stringify(data!.strengths ?? []),
              weaknesses: JSON.stringify(data!.weaknesses ?? []),
              trackUrls: data!.trackUrls ?? "",
            },
          });
          return NextResponse.json(created);
        }

        if (action === "update") {
          const updateData: Record<string, unknown> = {};
          if (data!.name !== undefined) updateData.name = data!.name;
          if (data!.position !== undefined) updateData.position = data!.position;
          if (data!.messaging !== undefined)
            updateData.messaging = data!.messaging;
          if (data!.strengths !== undefined)
            updateData.strengths = JSON.stringify(data!.strengths);
          if (data!.weaknesses !== undefined)
            updateData.weaknesses = JSON.stringify(data!.weaknesses);
          if (data!.trackUrls !== undefined)
            updateData.trackUrls = data!.trackUrls;

          const updated = await prisma.competitor.update({
            where: { id: competitorId! },
            data: updateData,
          });
          return NextResponse.json(updated);
        }

        if (action === "delete") {
          await prisma.competitor.delete({
            where: { id: competitorId! },
          });
          return NextResponse.json({ deleted: true });
        }

        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }

      // ── Topic CRUD ──────────────────────────────────────────
      case "topic": {
        const { action, topicId, data } = body as {
          action: "create" | "update" | "delete";
          topicId?: string;
          data?: {
            name?: string;
            authority?: string;
            keywords?: string[];
          };
        };

        if (action === "create") {
          const created = await prisma.topic.create({
            data: {
              clientId: id,
              name: data!.name!,
              authority: data!.authority ?? "emerging",
              keywords: JSON.stringify(data!.keywords ?? []),
            },
          });
          return NextResponse.json(created);
        }

        if (action === "update") {
          const updateData: Record<string, unknown> = {};
          if (data!.name !== undefined) updateData.name = data!.name;
          if (data!.authority !== undefined)
            updateData.authority = data!.authority;
          if (data!.keywords !== undefined)
            updateData.keywords = JSON.stringify(data!.keywords);

          const updated = await prisma.topic.update({
            where: { id: topicId! },
            data: updateData,
          });
          return NextResponse.json(updated);
        }

        if (action === "delete") {
          await prisma.topic.delete({ where: { id: topicId! } });
          return NextResponse.json({ deleted: true });
        }

        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }

      // ── Source CRUD + toggle ─────────────────────────────────
      case "source": {
        const { action, sourceId, data } = body as {
          action: "create" | "update" | "delete" | "toggle";
          sourceId?: string;
          data?: {
            name?: string;
            type?: string;
            url?: string;
            category?: string;
            active?: boolean;
          };
        };

        if (action === "create") {
          const created = await prisma.source.create({
            data: {
              clientId: id,
              name: data!.name!,
              type: data!.type!,
              url: data!.url ?? null,
              category: data!.category ?? "general",
              active: true,
            },
          });
          return NextResponse.json(created);
        }

        if (action === "update") {
          const updateData: Record<string, unknown> = {};
          if (data!.name !== undefined) updateData.name = data!.name;
          if (data!.type !== undefined) updateData.type = data!.type;
          if (data!.url !== undefined) updateData.url = data!.url;
          if (data!.category !== undefined) updateData.category = data!.category;
          if (data!.active !== undefined) updateData.active = data!.active;

          const updated = await prisma.source.update({
            where: { id: sourceId! },
            data: updateData,
          });
          return NextResponse.json(updated);
        }

        if (action === "toggle") {
          const source = await prisma.source.findUnique({
            where: { id: sourceId! },
          });
          if (!source)
            return NextResponse.json(
              { error: "Source not found" },
              { status: 404 }
            );

          const updated = await prisma.source.update({
            where: { id: sourceId! },
            data: { active: !source.active },
          });
          return NextResponse.json(updated);
        }

        if (action === "delete") {
          await prisma.source.delete({ where: { id: sourceId! } });
          return NextResponse.json({ deleted: true });
        }

        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown section: ${section}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("PATCH /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
