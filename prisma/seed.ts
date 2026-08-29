// Seeds one demo workspace, three users (one per role — brief C1/C2/submission
// requirement), and 120+ realistic feedback items across channels/sentiments so
// the app is demoable immediately (brief section 07: "seed data is required").
//
// NOTE: this script inserts raw feedback rows only. It does NOT call Claude to
// classify them (that would cost API credits and take a while for 120 items).
// Run `npm run dev`, log in, then click "Simulate channel" a few times and/or
// use the Inbox "Add feedback" box to trigger live AI classification during
// your demo — that's the moment your mentor actually wants to see anyway.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CHANNELS = ["Support Ticket", "App Store", "NPS Survey", "Sales Call Note", "Community Post"];

const SAMPLE_LINES = [
  "Onboarding took forever — I couldn't figure out how to invite my team.",
  "The new dashboard is gorgeous and finally fast. Huge improvement.",
  "It does the job, but the mobile experience needs work.",
  "Prospect wants SSO before they'll sign — third time this month.",
  "Love the new export feature, saved me an hour today.",
  "Billing page keeps timing out when I try to download an invoice.",
  "Support responded within minutes, really impressed with the team.",
  "Search is basically unusable once you have more than a few hundred items.",
  "Can we get dark mode? Half my team asks for it every week.",
  "The CSV import silently dropped three rows with no error message.",
  "Finally, an integration that actually works out of the box.",
  "Losing my filters every time I refresh the page is maddening.",
  "Customer said the onboarding video was the best they've seen.",
  "We need role-based permissions before we can roll this out company-wide.",
  "App crashed twice today while uploading screenshots.",
  "The pricing page is confusing — not clear what's included in each tier.",
  "Really solid update, notifications are much less noisy now.",
  "Still waiting on a reply to a ticket from four days ago.",
  "Team loves the new charts, way easier to share with leadership.",
  "Password reset email never arrived, had to contact support directly.",
  "Would pay more for a proper audit log feature.",
  "The mobile app logs me out randomly, very annoying mid-task.",
  "Great customer success call today, they really listened to our roadmap asks.",
  "Competitor has better reporting exports, we're considering switching.",
  "Loving the keyboard shortcuts, big productivity boost for our team.",
];

async function main() {
  console.log("Seeding database...");

  const workspace = await db.workspace.create({
    data: { name: "Acme Corp (Demo Workspace)" },
  });

  const password = await bcrypt.hash("Password123!", 10);
  const roles: { role: Role; name: string; email: string }[] = [
    { role: "ADMIN", name: "Ava Admin", email: "admin@acme.demo" },
    { role: "ANALYST", name: "Ravi Analyst", email: "analyst@acme.demo" },
    { role: "VIEWER", name: "Vic Viewer", email: "viewer@acme.demo" },
  ];

  for (const r of roles) {
    await db.user.create({
      data: { name: r.name, email: r.email, passwordHash: password, role: r.role, workspaceId: workspace.id },
    });
  }

  const themeNames = ["Onboarding", "Performance", "Billing", "Mobile Experience", "Integrations", "Pricing", "Support Response Time"];
  const themes = await Promise.all(
    themeNames.map((name) => db.theme.create({ data: { name, workspaceId: workspace.id } }))
  );

  const sentiments: ("POSITIVE" | "NEUTRAL" | "NEGATIVE")[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

  for (let i = 0; i < 130; i++) {
    const content = SAMPLE_LINES[i % SAMPLE_LINES.length];
    const channel = CHANNELS[i % CHANNELS.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const sentiment = sentiments[Math.floor(Math.random() * 3)];

    const feedback = await db.feedback.create({
      data: {
        content,
        channel,
        sentiment,
        sentimentScore: sentiment === "POSITIVE" ? 0.6 : sentiment === "NEGATIVE" ? -0.6 : 0,
        status: "NEW",
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        workspaceId: workspace.id,
      },
    });

    // Randomly attach 1 theme so Trends/Dashboard have something to chart.
    const theme = themes[Math.floor(Math.random() * themes.length)];
    await db.feedbackTheme.create({
      data: { feedbackId: feedback.id, themeId: theme.id, confidence: 0.8 },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins (password for all: Password123!):");
  roles.forEach((r) => console.log(`  ${r.role.padEnd(8)} ${r.email}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
