// GET one item, PATCH its status (the NEW -> REVIEWED -> ACTIONED workflow, brief C4.4).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { feedbackStatusSchema } from "@/lib/validations";
import { handleError } from "../route";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const item = await db.feedback.findFirst({
      // workspaceId is ALWAYS part of the where clause — this is what stops
      // someone from reading another company's row just by guessing an ID in the URL.
      where: { id: params.id, workspaceId: session.user.workspaceId },
      include: { themes: { include: { theme: true } } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const body = await req.json();
    const parsed = feedbackStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await db.feedback.findFirst({
      where: { id: params.id, workspaceId: session.user.workspaceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.feedback.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const existing = await db.feedback.findFirst({
      where: { id: params.id, workspaceId: session.user.workspaceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.feedback.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}