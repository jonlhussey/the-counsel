// app/lib/parseCard.ts
// Parse the structured shareable-card output from the model into typed fields.

export type PullQuote = {
  text: string;
  attribution: string; // e.g. "Marcus Aurelius, Meditations"
  isParaphrase: boolean;
};

export type CardData = {
  synopsis: string;
  voices: string[]; // list of thinker names
  pullQuotes: PullQuote[];
  synthesis: string;
};

/**
 * Parse the model's card output. Expected structure (loose):
 *   **Synopsis**
 *   <one sentence>
 *   **Voices**         (or **Voice**)
 *   Name · Name · Name (or just one name)
 *   **Pull Quotes**    (or **Pull Quote**)
 *   "..." — Thinker, Work
 *   "..." — Thinker, Work
 *   **Synthesis**
 *   <60-80 words>
 */
export function parseCard(text: string): CardData {
  const sections = splitSections(text);

  const synopsis = (sections["Synopsis"] || "").trim();
  const voicesRaw = (sections["Voices"] || sections["Voice"] || "").trim();
  const voices = voicesRaw
    .split(/\s*·\s*|\s*\n\s*/)
    .map((v) => v.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  const pullQuotesRaw =
    (sections["Pull Quotes"] || sections["Pull Quote"] || "").trim();
  const pullQuotes = parsePullQuotes(pullQuotesRaw);

  const synthesis = (sections["Synthesis"] || "").trim();

  return { synopsis, voices, pullQuotes, synthesis };
}

function splitSections(text: string): Record<string, string> {
  // Find each **Label** marker and capture content until the next one.
  const map: Record<string, string> = {};
  const labelRe = /\*\*([^*\n]+)\*\*\s*\n/g;
  const matches = [...text.matchAll(labelRe)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const label = m[1].trim();
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    map[label] = text.substring(start, end).trim();
  }
  return map;
}

function parsePullQuotes(raw: string): PullQuote[] {
  if (!raw || /^\[?no pull quote/i.test(raw.trim())) {
    return [];
  }

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const quotes: PullQuote[] = [];
  for (const line of lines) {
    // Skip stray bullet markers
    const cleaned = line.replace(/^[-*•]\s*/, "");
    if (!cleaned) continue;
    if (/^\[no pull quote/i.test(cleaned)) continue;

    // Match: "..." — attribution
    // Or:     "..." - attribution (em-dash, en-dash, or hyphen)
    const m = cleaned.match(/^["“"](.+?)["""]\s*[—–-]\s*(.+)$/);
    if (m) {
      const text = m[1].trim();
      const attribution = m[2].trim();
      const isParaphrase = /^\[paraphras/i.test(text) || /paraphras/i.test(text.slice(0, 20));
      const cleanText = text.replace(/^\[paraphrasing\]\s*/i, "").trim();
      quotes.push({ text: cleanText, attribution, isParaphrase });
    } else {
      // Fallback: try to handle missing closing quote or other variations
      const fallback = cleaned.match(/^["“"](.+?)\s*[—–-]\s*(.+)$/);
      if (fallback) {
        const text = fallback[1].trim().replace(/["""]$/, "");
        const attribution = fallback[2].trim();
        const isParaphrase = /^\[paraphras/i.test(text);
        const cleanText = text.replace(/^\[paraphrasing\]\s*/i, "").trim();
        quotes.push({ text: cleanText, attribution, isParaphrase });
      }
    }
  }
  return quotes;
}
