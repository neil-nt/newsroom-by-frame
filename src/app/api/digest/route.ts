import { NextRequest, NextResponse } from "next/server";
import { buildAndSendDigest } from "@/lib/delivery/digest";

/**
 * POST /api/digest
 * Trigger a digest email.
 * Body: { clientId, period: "daily"|"weekly", recipients: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, period, recipients } = body;

    if (!clientId || !period || !recipients?.length) {
      return NextResponse.json(
        { error: "clientId, period, and recipients[] are required" },
        { status: 400 }
      );
    }

    if (!["daily", "weekly"].includes(period)) {
      return NextResponse.json(
        { error: "period must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const result = await buildAndSendDigest({ clientId, period, recipients });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
