// AI4: Voice-of-Customer report. We compute every stat in plain code first, then
// hand ONLY those numbers to Claude to narrate (brief 9.3) — this is what makes
// the report reliable instead of a hallucinated summary.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";
import { reportCreateSchema } from "@/lib/validations";
import { generateVoCNarrative } from "@/lib/ai";
import { handleError } from "../feedback/route";

export async function GET() {
  try {
    const session = await requireSession();
    const reports = await db.report.findMany({
      where: { workspaceId: session.user.workspaceId },
      orderBy: { createdAt: "desc" },
      include: { generatedBy: { select: { name: true } } },
    });
    return NextResponse.json(reports);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["ADMIN", "ANALYST"]);

    const body = await req.json().catch(() => ({}));
    const { periodDays } = reportCreateSchema.parse({ periodDays: body.periodDays ?? 7 });

    const workspaceId = session.user.workspaceId;
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const periodFeedback = await db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: periodStart, lte: periodEnd } },
      include: { themes: { include: { theme: true } } },
    });

    const totalItems = periodFeedback.length;

    const sentimentBreakdown = ["POSITIVE", "NEUTRAL", "NEGATIVE"].map((s) => ({
      sentiment: s,
      count: periodFeedback.filter((f) => f.sentiment === s).length,
    }));

    // Top themes this period + % change vs previous period of equal length.
    const themeCounts = new Map<string, number>();
    for (const f of periodFeedback) {
      for (const ft of f.themes) {
        themeCounts.set(ft.theme.name, (themeCounts.get(ft.theme.name) ?? 0) + 1);
      }
    }
    const previousFeedback = await db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: previousStart, lt: periodStart } },
      include: { themes: { include: { theme: true } } },
    });
    const previousThemeCounts = new Map<string, number>();
    for (const f of previousFeedback) {
      for (const ft of f.themes) {
        previousThemeCounts.set(ft.theme.name, (previousThemeCounts.get(ft.theme.name) ?? 0) + 1);
      }
    }

    const topThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const prev = previousThemeCounts.get(name) ?? 0;
        const deltaVsPrevious = prev === 0 ? (count > 0 ? 100 : 0) : Math.round(((count - prev) / prev) * 100);
        return { name, count, deltaVsPrevious };
      });

    const sampleQuotes = periodFeedback.slice(0, 5).map((f) => f.content.slice(0, 160));

    const stats = {
      periodLabel: `${periodStart.toDateString()} – ${periodEnd.toDateString()}`,
      totalItems,
      sentimentBreakdown,
      topThemes,
      sampleQuotes,
    };

    const narrative = await generateVoCNarrative(stats);

    const report = await db.report.create({
      data: {
        title: `Voice of Customer — ${stats.periodLabel}`,
        periodStart,
        periodEnd,
        contentJson: { ...stats, ...narrative } as any,
        workspaceId,
        generatedById: session.user.id,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
