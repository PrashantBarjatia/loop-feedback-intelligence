// Admin-only: list members and invite (create) new ones with a role (brief C2).
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { memberInviteSchema } from "@/lib/validations";
import { handleError } from "../feedback/route";

export async function GET() {
  try {
    const session = await requireSession();
    const members = await db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(members);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN"]); // only admins manage members (brief C2.2)

    const body = await req.json();
    const parsed = memberInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const member = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        workspaceId: session.user.workspaceId,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN"]); // only admins can remove members

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("id");
    if (!memberId) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
    }

    // Prevent an admin from deleting their own account by accident — that
    // could leave a workspace with zero admins.
    if (memberId === session.user.id) {
      return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: { id: memberId, workspaceId: session.user.workspaceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.user.delete({ where: { id: memberId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}