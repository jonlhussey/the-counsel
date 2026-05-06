// app/api/pick-thinker/route.ts
// Asks the model to pick N thinkers from the roster based on the scenario.
// Used for "surprise me" mode in both single (count=1) and council (count=3).

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { THINKERS, getThinker } from "@/app/lib/thinkers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const SONNET = "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is not configured." },
        { status: 500 }
      );
    }

    const ip = getClientIp(req.headers);
    const { ok } = checkRateLimit(ip, "pick", 30);
    if (!ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const scenario = (body?.scenario ?? "").toString().trim();
    const count = Number(body?.count ?? 1);

    if (!scenario) {
      return NextResponse.json({ error: "Scenario required." }, { status: 400 });
    }
    if (![1, 3].includes(count)) {
      return NextResponse.json({ error: "Count must be 1 or 3." }, { status: 400 });
    }

    const roster = THINKERS.map(
      (t) => `${t.id} | ${t.name} (${t.tradition}) — ${t.framing}`
    ).join("\n");

    const prompt =
      count === 1
        ? `You are choosing 1 thinker from the following roster to reflect on a user's scenario. Pick the thinker whose primary writings most directly speak to this scenario.

Roster (id | name | description):
${roster}

User's scenario:
${scenario}

Return ONLY a JSON object in this exact format, with no other text:
{"thinker_ids": ["id"], "reasoning": "one sentence on why this thinker"}

The id must come from the roster above.`
        : `You are choosing 3 thinkers from the following roster to reflect on a user's scenario. Pick thinkers who would have substantively different perspectives, drawing from different traditions when reasonable.

Roster (id | name | description):
${roster}

User's scenario:
${scenario}

Return ONLY a JSON object in this exact format, with no other text:
{"thinker_ids": ["id1", "id2", "id3"], "reasoning": "one sentence on why these three"}

The three ids must come from the roster above. Aim for diverse perspectives.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const ids: string[] = parsed.thinker_ids;
    const valid = ids.filter((id) => getThinker(id));

    if (valid.length !== count) {
      return NextResponse.json(
        { error: `Could not pick ${count} valid thinker(s).` },
        { status: 500 }
      );
    }

    return NextResponse.json({ thinkerIds: valid });
  } catch (err) {
    console.error("Pick API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
