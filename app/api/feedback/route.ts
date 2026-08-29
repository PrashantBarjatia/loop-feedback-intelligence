// GET: paginated, filtered, searchable feedback list (brief C4).
// POST: single-entry ingestion (brief C3), which immediately triggers AI classification.
//
// The single most important rule in this whole file: every query includes
// `workspaceId: session.user.workspaceId`. That one clause is what stops
// Company A from ever reading Company B's rows (brief section 06, "non-negotiable
// security rule"). We never trust a workspaceId from the client — only from the session.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole, ApiError } from "@/lib/auth";
import { feedbackCreateSchema } from "@/lib/validations";
import { classifyFeedback } from "@/lib/ai";
import { toVector } from "@/lib/search";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const channel = searchParams.get("channel") ?? undefined;
    const sentiment = searchParams.get("sentiment") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const themeId = searchParams.get("themeId") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const where: any = {
      workspaceId: session.user.workspaceId, // <-- tenant isolation
      ...(channel ? { channel } : {}),
      ...(sentiment ? { sentiment } : {}),
      ...(status ? { status } : {}),
      ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
      ...(themeId ? { themes: { some: { themeId } } } : {}),
      ...(from || to
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.feedback.findMany({
        where,
        include: { themes: { include: { theme: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]); // Viewers are read-only (brief C2)

    const body = await req.json();
    const parsed = feedbackCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const feedback = await db.feedback.create({
      data: {
        content: parsed.data.content,
        channel: parsed.data.channel,
        customerLabel: parsed.data.customerLabel,
        workspaceId: session.user.workspaceId,
      },
    });

    // Fire-and-handle classification synchronously so the demo shows a fully
    // tagged item immediately. If Claude/validation fails, we don't fail the
    // whole request — the item is just left NEW/unclassified for manual re-classify.
    await classifyAndStore(feedback.id, session.user.workspaceId);

    const withThemes = await db.feedback.findUnique({
      where: { id: feedback.id },
      include: { themes: { include: { theme: true } } },
    });

    return NextResponse.json(withThemes, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

/** Shared by single-entry create, CSV import, and simulated channels. */
export async function classifyAndStore(feedbackId: string, workspaceId: string) {
  const feedback = await db.feedback.findUnique({ where: { id: feedbackId } });
  if (!feedback) return;

  const existingThemes = (await db.theme.findMany({ where: { workspaceId } })).map((t) => t.name);

  try {
    const result = await classifyFeedback(feedback.content, existingThemes);

    await db.feedback.update({
      where: { id: feedbackId },
      data: {
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        featureArea: result.featureArea,
      },
    });

    // Store the embedding used by Ask LOOP (see lib/search.ts).
    await db.embedding.upsert({
      where: { feedbackId },
      create: { feedbackId, vector: toVector(feedback.content) as any },
      update: { vector: toVector(feedback.content) as any },
    });

    // Attach to themes, creating new ones only when nothing matches.
    for (const themeName of result.themes) {
      const theme = await db.theme.upsert({
        where: { workspaceId_name: { workspaceId, name: themeName } },
        create: { workspaceId, name: themeName },
        update: {},
      });
      await db.feedbackTheme.upsert({
        where: { feedbackId_themeId: { feedbackId, themeId: theme.id } },
        create: { feedbackId, themeId: theme.id, confidence: 0.9 },
        update: {},
      });
    }
  } catch (err) {
    // Classification failing should never crash ingestion — it just stays
    // unclassified and visible in the inbox for manual re-classify (brief AI1.4).
    console.error("Classification failed for", feedbackId, err);
  }
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
