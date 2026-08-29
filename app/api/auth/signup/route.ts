// Sign-up creates BOTH a Workspace and a User in one transaction, and the creator
// becomes ADMIN (brief C1, acceptance criterion 1). We use a transaction so we
// never end up with a User but no Workspace (or vice versa) if something fails
// halfway through.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, workspaceName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name: workspaceName } });
    const user = await tx.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    });
    return { workspace, user };
  });

  return NextResponse.json({ id: result.user.id }, { status: 201 });
}
