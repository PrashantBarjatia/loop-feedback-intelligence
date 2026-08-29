// Manual "re-classify" action (brief AI1, acceptance criterion 4) — lets an
// analyst correct a bad AI tag by asking Claude to try again.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { classifyAndStore, handleError } from "../../route";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const existing = await db.feedback.findFirst({
      where: { id: params.id, workspaceId: session.user.workspaceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await classifyAndStore(params.id, session.user.workspaceId);

    const updated = await db.feedback.findUnique({
      where: { id: params.id },
      include: { themes: { include: { theme: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}
