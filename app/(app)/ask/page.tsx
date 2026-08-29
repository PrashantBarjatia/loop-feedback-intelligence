"use client";
// AI3 UI: chat-style box, grounded answer + cited source items (brief AI3).
import { useState } from "react";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string; sources: any[] } | null>(null);
  const [history, setHistory] = useState<{ question: string; answer: string; sources: any[] }[]>([]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    const res = await fetch("/api/insights/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setResult(data);
    setHistory((h) => [{ question, answer: data.answer, sources: data.sources }, ...h]);
    setQuestion("");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">
        Ask a plain-English question. LOOP retrieves the most relevant feedback first, then answers
        only from what it found — it will tell you if the data doesn't have an answer.
      </p>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What are users saying about onboarding?"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button disabled={loading} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      <div className="space-y-4">
        {history.map((h, i) => (
          <div key={i} className="bg-white border rounded-xl p-4 space-y-3">
            <p className="font-medium text-sm">{h.question}</p>
            <p className="text-sm text-gray-700">{h.answer}</p>
            {h.sources?.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-gray-400">Sources used:</p>
                {h.sources.map((s: any, idx: number) => (
                  <p key={s.id} className="text-xs text-gray-500">[{idx + 1}] ({s.channel}) {s.content}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
