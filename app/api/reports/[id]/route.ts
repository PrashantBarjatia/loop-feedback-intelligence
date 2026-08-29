import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { handleError } from "../../feedback/route";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const report = await db.report.findFirst({
      where: { id: params.id, workspaceId: session.user.workspaceId },
      include: { generatedBy: { select: { name: true } } },
    });
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (err) {
    return handleError(err);
  }
}
