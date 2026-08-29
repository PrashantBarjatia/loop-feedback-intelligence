// CSV bulk upload (brief C3.2). Expects a multipart form with a "file" field.
// Reports how many rows imported vs failed, per the acceptance criteria.
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { classifyAndStore, handleError } from "../route";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    const createdIds: string[] = [];

    for (const [i, row] of parsed.data.entries()) {
      const content = row.content?.trim();
      const channel = row.channel?.trim();
      if (!content || !channel) {
        failed++;
        errors.push(`Row ${i + 1}: missing required content/channel`);
        continue;
      }
      const created = await db.feedback.create({
        data: {
          content,
          channel,
          customerLabel: row.customer_label?.trim() || undefined,
          workspaceId: session.user.workspaceId,
        },
      });
      createdIds.push(created.id);
      imported++;
    }

    // Classify sequentially to keep this simple and avoid hammering the API with
    // concurrent requests. For a large CSV in real production you'd queue this,
    // but sequential is fine and explainable for a 120-row seed/demo dataset.
    for (const id of createdIds) {
      await classifyAndStore(id, session.user.workspaceId);
    }

    return NextResponse.json({ imported, failed, errors });
  } catch (err) {
    return handleError(err);
  }
}
