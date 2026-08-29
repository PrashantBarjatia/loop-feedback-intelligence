"use client";
// Client component so we can fetch from our own API and drive Recharts (brief C5).
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import StatCard from "@/components/StatCard";

const COLORS: Record<string, string> = { POSITIVE: "#22c55e", NEUTRAL: "#94a3b8", NEGATIVE: "#ef4444" };

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/feedback?pageSize=50").then((r) => r.json()),
      fetch("/api/themes").then((r) => r.json()),
    ]).then(([feedbackRes, themesRes]) => {
      setItems(feedbackRes.items ?? []);
      setThemes(themesRes ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard...</p>;

  const total = items.length;
  const negativePct = total ? Math.round((items.filter((i) => i.sentiment === "NEGATIVE").length / total) * 100) : 0;
  const thisWeek = items.filter((i) => new Date(i.createdAt) > new Date(Date.now() - 7 * 86400000)).length;

  const sentimentData = ["POSITIVE", "NEUTRAL", "NEGATIVE"].map((s) => ({
    name: s,
    value: items.filter((i) => i.sentiment === s).length,
  }));

  const volumeByDay: Record<string, number> = {};
  for (const i of items) {
    const day = new Date(i.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    volumeByDay[day] = (volumeByDay[day] ?? 0) + 1;
  }
  const volumeData = Object.entries(volumeByDay).map(([day, count]) => ({ day, count })).reverse();

  const topThemes = themes.slice(0, 6).map((t) => ({ name: t.name, count: t.totalCount }));

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total feedback" value={total} />
        <StatCard label="% negative" value={`${negativePct}%`} />
        <StatCard label="New this week" value={thisWeek} />
      </div>

      {total === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
          No feedback yet. Add some in the Inbox to see your dashboard come alive.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Volume over time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Sentiment breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-xl p-4 col-span-2">
            <h2 className="font-semibold mb-3">Top themes</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topThemes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" width={140} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
