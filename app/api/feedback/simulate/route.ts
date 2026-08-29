// Simulates a "channel" integration (brief C3.3 / out-of-scope real integrations).
// Seeds a handful of realistic items as if they'd just come in from that channel.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { classifyAndStore, handleError } from "../route";

const SIMULATED_ITEMS: Record<string, string[]> = {
  "App Store": [
    "Crashes every time I try to export a PDF on iOS 17.",
    "Beautiful redesign, but I miss the old keyboard shortcuts.",
    "Would love dark mode — my eyes are dying at night.",
  ],
  "Support Ticket": [
    "Can't reset my password, the reset email never arrives.",
    "Team invite links expire way too fast, had to resend three times.",
  ],
  "Sales Call Note": [
    "Prospect said they'll only sign if we add SSO before renewal.",
    "Customer mentioned competitor X has better reporting exports.",
  ],
};

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const body = await req.json().catch(() => ({}));
    const channel: string = body.channel ?? "App Store";
    const items = SIMULATED_ITEMS[channel] ?? SIMULATED_ITEMS["App Store"];

    const createdIds: string[] = [];
    for (const content of items) {
      const created = await db.feedback.create({
        data: { content, channel, workspaceId: session.user.workspaceId },
      });
      createdIds.push(created.id);
    }
    for (const id of createdIds) {
      await classifyAndStore(id, session.user.workspaceId);
    }

    return NextResponse.json({ imported: createdIds.length, channel });
  } catch (err) {
    return handleError(err);
  }
}
