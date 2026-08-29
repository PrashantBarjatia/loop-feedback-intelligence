"use client";
// AI2 UI: theme list with counts, spike flags, and drill-down into feedback.
import { useEffect, useState } from "react";

export default function TrendsPage() {
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ id: string; name: string; items: any[] } | null>(null);

  useEffect(() => {
    fetch("/api/themes").then((r) => r.json()).then((data) => { setThemes(data); setLoading(false); });
  }, []);

  async function openTheme(theme: any) {
    const res = await fetch(`/api/feedback?themeId=${theme.id}&pageSize=20`);
    const data = await res.json();
    setDrillDown({ id: theme.id, name: theme.name, items: data.items ?? [] });
  }

  if (loading) return <p className="text-gray-500">Loading trends...</p>;

  return (
    <div className="space-y-6">

      {themes.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
          No themes yet — add feedback in the Inbox and Claude will start clustering it.
        </div>
      ) : (
        <div className="bg-white border rounded-xl divide-y">
          {themes.map((t) => (
            <button key={t.id} onClick={() => openTheme(t)} className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <span className="font-medium">{t.name}</span>
                {t.spiking && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Spiking</span>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {t.totalCount} total · {t.thisWeek} this week ({t.deltaPct >= 0 ? "+" : ""}{t.deltaPct}% vs last week)
                </div>
              </div>
              <span className="text-sm text-brand">View feedback →</span>
            </button>
          ))}
        </div>
      )}

      {drillDown && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6" onClick={() => setDrillDown(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">{drillDown.name}</h2>
              <button onClick={() => setDrillDown(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {drillDown.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 text-sm">
                  <p>{item.content}</p>
                  <span className="text-xs text-gray-400">{item.channel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
