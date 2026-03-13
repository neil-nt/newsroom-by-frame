import { NextRequest, NextResponse } from "next/server";
import { generatePitch } from "@/lib/intelligence/pitch-draft";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { alertId, clientId } = body as { alertId?: string; clientId?: string };

    if (!alertId || !clientId) {
      return NextResponse.json(
        { success: false, error: "alertId and clientId are required" },
        { status: 400 }
      );
    }

    const pitch = await generatePitch(alertId, clientId);
    return NextResponse.json({ success: true, pitch });
  } catch (error) {
    console.error("Pitch generation error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
