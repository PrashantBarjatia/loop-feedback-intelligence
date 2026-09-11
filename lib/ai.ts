// Every call to an AI provider lives in this one file. Route handlers call
// these functions; they never talk to the AI SDK directly. That keeps the
// API key server-side and keeps prompt logic in one place (brief section 06).
//
// PROVIDER NOTE: this project was originally built against the Anthropic
// Claude API, per the brief's stated tech stack (Section 05). It was swapped
// to Google's Gemini API (free tier via Google AI Studio) after Anthropic
// API credits were exhausted during testing/demo. Because every AI call was
// already isolated to this single file, the swap required no changes
// anywhere else in the app — every route handler still calls the same
// exported function names (classifyFeedback, answerFromFeedback,
// generateVoCNarrative) with the same inputs/outputs.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const MODEL = "gemini-3.6-flash"; // fast, available on Gemini's free tier

// ---------- AI1: Structured classification ----------

const ClassificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).min(1).max(3),
  featureArea: z.string(),
  rationale: z.string(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

/**
 * Classifies one piece of feedback. Reuses existing theme names where possible
 * so the model doesn't invent a slightly-differently-named theme every time
 * (brief section 9.1).
 */
export async function classifyFeedback(
  content: string,
  existingThemes: string[]
): Promise<Classification> {
  const prompt = `You are classifying a single piece of customer feedback for a product team.

Existing theme names in this workspace (reuse one of these if it fits; only invent a new short theme name if none fit):
${existingThemes.length ? existingThemes.join(", ") : "(none yet — you may create the first ones)"}

Feedback to classify:
"""
${content}
"""

Return ONLY a JSON object, no markdown fences, no commentary, with exactly this shape:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": number between -1 (very negative) and 1 (very positive),
  "themes": array of 1-3 short theme names (strings),
  "featureArea": short string naming the product area this touches,
  "rationale": one short sentence explaining the classification
}`;

  const raw = await callGeminiForJson(prompt);
  const parsed = ClassificationSchema.safeParse(raw);

  if (!parsed.success) {
    // Retry once with a stricter reminder before giving up (brief 9.1: "retry once,
    // then flag for manual review" — here we throw, and the route handler decides
    // how to flag it).
    const retryRaw = await callGeminiForJson(
      prompt + "\n\nReminder: return ONLY valid JSON matching the exact shape above."
    );
    const retryParsed = ClassificationSchema.safeParse(retryRaw);
    if (!retryParsed.success) {
      throw new Error("Classification failed validation twice: " + retryParsed.error.message);
    }
    return retryParsed.data;
  }

  return parsed.data;
}

// ---------- AI3: Retrieval-grounded Q&A ("Ask LOOP") ----------

export async function answerFromFeedback(
  question: string,
  matchedFeedback: { id: string; content: string; channel: string; sentiment: string | null }[]
): Promise<string> {
  const context = matchedFeedback
    .map((f, i) => `[${i + 1}] (channel: ${f.channel}, sentiment: ${f.sentiment ?? "unknown"}) ${f.content}`)
    .join("\n");

  const prompt = `You are answering a product manager's question using ONLY the customer feedback excerpts below.
Do not invent, assume, or add any feedback that is not listed. If the excerpts don't contain
enough information to answer, say so plainly instead of guessing.

Feedback excerpts:
${context || "(no matching feedback found)"}

Question: ${question}

Write a concise, direct answer (3-6 sentences). Refer to excerpts by their [number] when citing them.`;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ---------- AI4: Voice-of-Customer report ----------

export async function generateVoCNarrative(stats: {
  periodLabel: string;
  totalItems: number;
  sentimentBreakdown: { sentiment: string; count: number }[];
  topThemes: { name: string; count: number; deltaVsPrevious: number }[];
  sampleQuotes: string[];
}): Promise<{ summary: string; recommendedActions: string[] }> {
  // We pre-compute every number in code (see app/api/reports/route.ts) and only
  // ask the model to write the narrative AROUND those numbers. This is the
  // pattern the brief specifies in section 9.3 — it stops the model from
  // inventing figures.
  const prompt = `You are writing the narrative section of a Voice-of-Customer report for
the period "${stats.periodLabel}". Use ONLY the numbers and quotes given below — do not
invent statistics.

Total feedback items: ${stats.totalItems}
Sentiment breakdown: ${stats.sentimentBreakdown.map((s) => `${s.sentiment}: ${s.count}`).join(", ")}
Top themes (name, count, change vs previous period): ${stats.topThemes
    .map((t) => `${t.name} (${t.count}, ${t.deltaVsPrevious >= 0 ? "+" : ""}${t.deltaVsPrevious}%)`)
    .join("; ")}
Representative verbatim quotes:
${stats.sampleQuotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Return ONLY JSON, no markdown fences:
{
  "summary": "a 4-6 sentence executive summary a Head of Product could forward as-is",
  "recommendedActions": ["3 to 5 short, concrete recommended actions"]
}`;

  const raw = await callGeminiForJson(prompt);
  const schema = z.object({
    summary: z.string(),
    recommendedActions: z.array(z.string()),
  });
  return schema.parse(raw);
}

// ---------- shared helpers ----------

async function callGeminiForJson(prompt: string): Promise<unknown> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Strip stray markdown fences in case the model wraps JSON in ```json ... ```
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Model did not return valid JSON: " + text.slice(0, 200));
  }
}