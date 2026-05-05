// app/api/council/route.ts
// Council mode: pick 3 thinkers, run their reflections in parallel using Haiku,
// then synthesize using Sonnet.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildCouncilSystemPrompt,
  buildSynthesisPrompt,
} from "@/app/lib/systemPrompt";
import { THINKERS, getThinker } from "@/app/lib/thinkers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

// Use Sonnet for the suggestion step too — picking 3 thinkers requires
// understanding scenario nuance. This is one cheap call.
async function suggestThinkers(
  client: Anthropic,
  scenario: string
): Promise<string[]> {
  const roster = THINKERS.map(
    (t) => `${t.id} | ${t.name} (${t.tradition}) — ${t.framing}`
  ).join("\n");

  const suggestionPrompt = `You are choosing 3 thinkers from the following roster to reflect on a user's scenario. Pick thinkers who would have substantively different perspectives on this scenario, drawing from different traditions when reasonable.

Roster (id | name | description):
${roster}

User's scenario:
${scenario}

Return ONLY a JSON object in this exact format, with no other text:
{"thinker_ids": ["id1", "id2", "id3"], "reasoning": "one sentence on why these three"}

The three ids must come from the roster above. Aim for diverse perspectives — if the scenario is about courage, don't pick three Stoics; mix philosophical, religious, and modern voices when it fits.`;

  const response = await client.messages.create({
    model: SONNET,
    max_tokens: 400,
    messages: [{ role: "user", content: suggestionPrompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Extract JSON from possible code fences
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const ids: string[] = parsed.thinker_ids;

  // Validate all ids exist
  const valid = ids.filter((id) => getThinker(id));
  if (valid.length !== 3) {
    throw new Error(
      `Suggestion returned ${valid.length} valid thinker ids, expected 3`
    );
  }
  return valid;
}

async function reflectAsThinker(
  client: Anthropic,
  thinkerId: string,
  scenario: string
): Promise<{ thinker: string; reflection: string }> {
  const thinker = getThinker(thinkerId);
  if (!thinker) throw new Error(`Unknown thinker: ${thinkerId}`);

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 700,
    system: buildCouncilSystemPrompt(thinker),
    messages: [{ role: "user", content: `Scenario:\n\n${scenario}` }],
  });

  const reflection = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  return { thinker: thinker.name, reflection };
}

async function synthesize(
  client: Anthropic,
  thinkerNames: string[],
  reflections: { thinker: string; reflection: string }[]
): Promise<string> {
  const reflectionsText = reflections
    .map((r) => `=== ${r.thinker} ===\n${r.reflection}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 500,
    system: buildSynthesisPrompt(thinkerNames),
    messages: [
      {
        role: "user",
        content: `Here are the three reflections to synthesize:\n\n${reflectionsText}`,
      },
    ],
  });

  return message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is not configured. Missing ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const ip = getClientIp(req.headers);
    // Council uses more compute per request — slightly tighter limit.
    const { ok, remaining } = checkRateLimit(ip, "council", 10);
    if (!ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const scenario = (body?.scenario ?? "").toString().trim();

    if (!scenario) {
      return NextResponse.json(
        { error: "Please describe a scenario." },
        { status: 400 }
      );
    }
    if (scenario.length > 2000) {
      return NextResponse.json(
        { error: "Scenario is too long. Please keep it under 2000 characters." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Step 1: pick 3 thinkers
    const thinkerIds = await suggestThinkers(client, scenario);

    // Step 2: get reflections in parallel
    const reflections = await Promise.all(
      thinkerIds.map((id) => reflectAsThinker(client, id, scenario))
    );

    // Step 3: synthesize
    const synthesis = await synthesize(
      client,
      reflections.map((r) => r.thinker),
      reflections
    );

    return NextResponse.json(
      {
        thinkerIds,
        reflections,
        synthesis,
        remaining,
      },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err: unknown) {
    console.error("Council API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: `Something went wrong: ${message}` },
      { status: 500 }
    );
  }
}
