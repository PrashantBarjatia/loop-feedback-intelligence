// AI3: Ask LOOP — retrieve the most relevant feedback, then ground Claude's
// answer in exactly those items (brief 9.2 / Figure 4: "retrieve, then answer").
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { askSchema } from "@/lib/validations";
import { toVector, topKMatches } from "@/lib/search";
import { answerFromFeedback } from "@/lib/ai";
import { handleError } from "../../feedback/route";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = askSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Step 1: pull every embedding in this workspace only (tenant isolation).
    const embeddings = await db.embedding.findMany({
      where: { feedback: { workspaceId: session.user.workspaceId } },
      include: { feedback: true },
    });

    // Step 2: rank by similarity to the question, take the top 8.
    const queryVector = toVector(parsed.data.question);
    const candidates = embeddings.map((e) => ({ id: e.feedbackId, vector: e.vector as Record<string, number> }));
    const topMatches = topKMatches(queryVector, candidates, 8);

    const matchedFeedback = topMatches
      .map((m) => embeddings.find((e) => e.feedbackId === m.id)?.feedback)
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ id: f.id, content: f.content, channel: f.channel, sentiment: f.sentiment }));

    // Step 3: ask Claude to answer ONLY from those items.
    const answer = await answerFromFeedback(parsed.data.question, matchedFeedback);

    return NextResponse.json({ answer, sources: matchedFeedback });
  } catch (err) {
    return handleError(err);
  }
}
