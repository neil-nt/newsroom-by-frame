import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyBrief, generateWeeklyBrief } from "@/lib/delivery/weekly-brief";
import type { BriefSection } from "@/lib/delivery/weekly-brief";

// POST — generate and send the weekly brief
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, email, sections } = body as {
      clientId?: string;
      email?: string;
      sections?: BriefSection[];
    };

    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId required" }, { status: 400 });
    }

    const toEmail = email || "neil@new-terrain.io";
    const sent = await sendWeeklyBrief(clientId, toEmail, sections);

    return NextResponse.json({ success: true, sent, email: toEmail });
  } catch (error) {
    console.error("Weekly brief error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// GET — preview the weekly brief HTML
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId required" }, { status: 400 });
    }

    const sectionsParam = request.nextUrl.searchParams.get("sections");
    const sections = sectionsParam
      ? (sectionsParam.split(",") as BriefSection[])
      : undefined;

    const { html } = await generateWeeklyBrief(clientId, sections);

    // Return as HTML for browser preview
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Weekly brief preview error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
