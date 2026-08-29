// AI2: theme list with counts and week-over-week trend/spike detection.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { handleError } from "../feedback/route";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.user.workspaceId;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const themes = await db.theme.findMany({ where: { workspaceId } });

    const links = await db.feedbackTheme.findMany({
      where: { theme: { workspaceId } },
      select: { themeId: true, feedback: { select: { createdAt: true } } },
    });

    const results = themes.map((theme) => {
      const themeLinks = links.filter((l) => l.themeId === theme.id);
      const totalCount = themeLinks.length;
      const thisWeek = themeLinks.filter((l) => l.feedback.createdAt >= weekAgo).length;
      const lastWeek = themeLinks.filter(
        (l) => l.feedback.createdAt >= twoWeeksAgo && l.feedback.createdAt < weekAgo
      ).length;

      const deltaPct = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

      return {
        id: theme.id,
        name: theme.name,
        color: theme.color,
        totalCount,
        thisWeek,
        lastWeek,
        deltaPct,
        spiking: deltaPct >= 50 && thisWeek >= 3,
      };
    });

    results.sort((a, b) => b.totalCount - a.totalCount);
    return NextResponse.json(results);
  } catch (err) {
    return handleError(err);
  }
}