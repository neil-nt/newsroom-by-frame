import { NextRequest, NextResponse } from "next/server";
import { runPipelineForClient, runPipelineForAllClients } from "@/lib/ingestion/pipeline";

/**
 * POST /api/ingest
 * Triggers the ingestion pipeline.
 * Body: { clientId?: string } -- if no clientId, runs for all clients.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId } = body as { clientId?: string };

    if (clientId) {
      const result = await runPipelineForClient(clientId);
      return NextResponse.json({ success: true, result });
    }

    const results = await runPipelineForAllClients();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Ingestion pipeline error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
