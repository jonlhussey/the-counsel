# The Counsel

A Next.js app for ethical reflection through the writings of history's great thinkers.

Describe a scenario. Receive a reflection — either from one chosen thinker, or from a council of three with different perspectives, ending in a brief synthesis of where they converge and diverge.

The app's behavior is governed by two things: a general method (the "constitution"), and a metadata file with one entry per thinker. Edit either to refine the app.

---

## What's in this project

```
the-counsel/
├── app/
│   ├── api/
│   │   ├── reflect/route.ts        # Single thinker mode (Sonnet 4.6)
│   │   └── council/route.ts         # Council of three (Haiku 4.5)
│   ├── components/
│   │   ├── ThinkerBrowser.tsx       # Searchable list/grid of thinkers
│   │   └── FormattedReflection.tsx  # Renders structured reflection output
│   ├── lib/
│   │   ├── thinkers.ts              # The 80 thinkers — edit to add/remove
│   │   ├── systemPrompt.ts          # The constitution — edit to refine method
│   │   └── rateLimit.ts             # In-memory per-IP rate limiter
│   ├── globals.css                  # Atrium aesthetic styles
│   ├── layout.tsx                   # Root layout, font loading
│   └── page.tsx                     # Main UI
├── .env.example                     # Template for API key
├── .gitignore
├── package.json
└── README.md
```

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Anthropic SDK · Claude Sonnet 4.6 (single mode) and Haiku 4.5 (council mode)

**Key features**
- Two modes: single thinker (focused, deeper) and council of three (parallel reflections + synthesis)
- 80 thinkers across 9 traditions, each with primary corpus, framing, and exclusions
- Searchable list/grid browser
- Automatic thinker selection in council mode based on scenario
- Inference markers: red badges visually separate textual evidence from interpretation
- Confidence pills (High/Medium/Low) for each reflection
- Local history saved in browser localStorage
- Share via copy, X/Twitter, Facebook
- Per-IP rate limiting (20/hr single, 10/hr council)

---

## Part 1 — Run locally

### Prerequisites
- Node.js 18.17 or later
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)

### Steps

```bash
cd the-counsel
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-api03-...your-actual-key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test it

Try a scenario in single mode with someone whose corpus you know — Marcus Aurelius for a workplace conflict, the Buddha for craving, or Mary Wollstonecraft for a question of equality. Then try the same scenario in council mode and see who the app picks.

---

## Part 2 — Push to GitHub

```bash
cd the-counsel
git init
git add .
git commit -m "Initial commit"
```

Create a new repository at [github.com/new](https://github.com/new):
- Name it `the-counsel`
- Public or private — your call
- Do NOT initialize with README, .gitignore, or license

Then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/the-counsel.git
git branch -M main
git push -u origin main
```

---

## Part 3 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `the-counsel` repo
3. Vercel auto-detects Next.js — leave settings alone
4. **Expand Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your API key
5. Click Deploy

Vercel deploys in about a minute and gives you a URL like `the-counsel-xyz.vercel.app`.

---

## Cost considerations

Single mode uses Sonnet 4.6 — roughly **$0.01–0.02 per reflection**.

Council mode uses Sonnet 4.6 for the thinker-suggestion step, then Haiku 4.5 for three parallel reflections and the synthesis. That works out to roughly **$0.015–0.025 per council** — much cheaper than running three Sonnet calls (~$0.06).

Rate limits (per IP per hour): 20 single mode, 10 council mode. To change, edit `app/lib/rateLimit.ts` callers in the route files.

To swap models, edit the constants at the top of `app/api/reflect/route.ts` and `app/api/council/route.ts`.

---

## Editing the thinker roster

`app/lib/thinkers.ts` holds the 80 thinkers. Each entry has:

```typescript
{
  id: "kebab-case-id",
  name: "Display Name",
  era: "1900–1950 CE",
  tradition: "One of nine traditions",
  framing: "How to introduce them historically",
  primary_corpus: ["Primary Work 1", "Primary Work 2"],
  excluded: ["What NOT to draw on"],
  key_patterns: ["Recurring themes in their thought"],
  tone_note: "How they actually wrote/spoke",
  tags: ["search", "tags"],
  thin_corpus?: true  // optional, signals limited surviving writings
}
```

To add a thinker: append a new entry. The browser and council selector pick it up automatically.

To remove a thinker: delete the entry. (If it appeared in old history items, those will show "Unknown thinker" — that's fine.)

The system prompt is built dynamically from each entry, so the quality of reflections depends heavily on accurate primary corpus and exclusion lists.

---

## Editing the constitution

`app/lib/systemPrompt.ts` has three prompt builders:

- `buildSystemPrompt(thinker)` — full single-thinker reflection
- `buildCouncilSystemPrompt(thinker)` — brief council-mode reflection
- `buildSynthesisPrompt(thinkerNames)` — the synthesis at the end

The five-section structure (Scenario Restated, From the Corpus, Pattern Observed, Applied Interpretation, Confidence) is enforced in section 6 of `buildSystemPrompt`. The `[INFERENCE]` token is what triggers the red badge in the rendered output.

---

## Troubleshooting

**Reflections don't follow the structure.** Strengthen section 6 of the prompt. Be specific.

**Council picks a strange combination of thinkers.** Edit the `suggestThinkers` function in `app/api/council/route.ts` to give better instructions.

**Rate limit hit.** The in-memory limiter resets on serverless function restart. For production with significant traffic, swap in Vercel KV or Upstash Redis.

---

## A note on responsibility

The Counsel offers interpretations of historical writings, not religious or philosophical instruction. The constitution insists that reflections are "invitations to reflection, not verdicts." Keep this in mind if you adapt the prompts.
