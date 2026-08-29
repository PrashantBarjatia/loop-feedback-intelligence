"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVE: "bg-green-100 text-green-700",
  NEUTRAL: "bg-gray-100 text-gray-700",
  NEGATIVE: "bg-red-100 text-red-700",
};

export default function InboxPage() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "ANALYST";

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ q: "", channel: "", sentiment: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ content: "", channel: "Support Ticket" });
  const [csvSummary, setCsvSummary] = useState<{ imported: number; failed: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    const res = await fetch(`/api/feedback?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.content.trim()) return;
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    setNewItem({ content: "", channel: "Support Ticket" });
    setSubmitting(false);
    setPage(1);
    load();
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setSubmitting(true);
    const res = await fetch("/api/feedback/upload", { method: "POST", body: formData });
    const data = await res.json();
    setCsvSummary(data);
    setSubmitting(false);
    e.target.value = "";
    load();
  }

  async function handleSimulate(channel: string) {
    setSubmitting(true);
    await fetch("/api/feedback/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    setSubmitting(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function reclassify(id: string) {
    setSubmitting(true);
    await fetch(`/api/feedback/${id}/classify`, { method: "POST" });
    setSubmitting(false);
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this feedback item? This cannot be undone.")) return;
    await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">

      {canEdit && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">Add feedback</h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              placeholder="Paste a piece of customer feedback..."
              value={newItem.content}
              onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={newItem.channel}
              onChange={(e) => setNewItem({ ...newItem, channel: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {["Support Ticket", "App Store", "NPS Survey", "Sales Call Note", "Community Post"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button disabled={submitting} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              Add
            </button>
          </form>

          <div className="flex items-center gap-3 pt-2 border-t text-sm">
            <label className="text-gray-500">Bulk import CSV:</label>
            <input type="file" accept=".csv" onChange={handleCsv} className="text-sm" />
            <span className="text-gray-300">|</span>
            <label className="text-gray-500">Simulate channel:</label>
            {["App Store", "Support Ticket", "Sales Call Note"].map((c) => (
              <button key={c} onClick={() => handleSimulate(c)} className="text-brand hover:underline">
                {c}
              </button>
            ))}
          </div>
          {csvSummary && (
            <p className="text-sm text-gray-600">
              Imported {csvSummary.imported}, failed {csvSummary.failed}.
            </p>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <input
          placeholder="Search feedback..."
          value={filters.q}
          onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <select value={filters.sentiment} onChange={(e) => { setPage(1); setFilters({ ...filters, sentiment: e.target.value }); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="NEGATIVE">Negative</option>
        </select>
        <select value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-500">No feedback matches these filters.</div>
      ) : (
        <div className="bg-white border rounded-xl divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm">{item.content}</p>
                <div className="flex gap-2 mt-2 flex-wrap items-center text-xs">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{item.channel}</span>
                  {item.sentiment && (
                    <span className={`px-2 py-0.5 rounded ${SENTIMENT_COLOR[item.sentiment]}`}>{item.sentiment}</span>
                  )}
                  {item.themes?.map((t: any) => (
                    <span key={t.theme.id} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{t.theme.name}</span>
                  ))}
                  {!item.sentiment && <span className="text-gray-400">Not yet classified</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <select
                  disabled={!canEdit}
                  value={item.status}
                  onChange={(e) => updateStatus(item.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="ACTIONED">Actioned</option>
                </select>
                {canEdit && (
                  <button onClick={() => reclassify(item.id)} className="text-xs text-brand hover:underline">
                    Re-classify
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => deleteItem(item.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-3 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
        <span className="py-1">Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
