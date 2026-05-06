// app/api/reflect/route.ts
// Single thinker mode: returns the long reflection and the shareable card data.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildSingleCardPrompt,
} from "@/app/lib/systemPrompt";
import { getThinker, type Thinker } from "@/app/lib/thinkers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import { parseCard } from "@/app/lib/parseCard";

export const runtime = "nodejs";
export const maxDuration = 45;

const SONNET = "claude-sonnet-4-6";
const HAIKU = "claude-haiku-4-5-20251001";

async function generateReflection(
  client: Anthropic,
  thinker: Thinker,
  scenario: string
): Promise<string> {
  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 1500,
    system: buildSystemPrompt(thinker),
    messages: [{ role: "user", content: `Scenario:\n\n${scenario}` }],
  });

  return message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

async function generateCard(
  client: Anthropic,
  thinker: Thinker,
  scenario: string,
  reflection: string
): Promise<string> {
  // Card uses Haiku — it's a summarization, not deep reasoning.
  // Pass the full reflection as context so the card stays consistent with it.
  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 600,
    system: buildSingleCardPrompt(thinker),
    messages: [
      {
        role: "user",
        content: `User's scenario:\n\n${scenario}\n\nThe long-form reflection that was just written:\n\n${reflection}\n\nNow produce the shareable card.`,
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
    const { ok, remaining } = checkRateLimit(ip, "reflect", 20);
    if (!ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const scenario = (body?.scenario ?? "").toString().trim();
    const thinkerId = (body?.thinkerId ?? "").toString().trim();

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
    if (!thinkerId) {
      return NextResponse.json(
        { error: "Please choose a thinker." },
        { status: 400 }
      );
    }

    const thinker = getThinker(thinkerId);
    if (!thinker) {
      return NextResponse.json(
        { error: `Unknown thinker: ${thinkerId}` },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    // First: the long reflection (the user is waiting on this)
    const reflection = await generateReflection(client, thinker, scenario);

    // Second: the card. We pass the reflection so the card stays consistent.
    const cardRaw = await generateCard(client, thinker, scenario, reflection);
    const card = parseCard(cardRaw);

    return NextResponse.json(
      {
        reflection,
        thinker: thinker.name,
        card,
        cardRaw, // included for debugging — UI doesn't need it
        remaining,
      },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err: unknown) {
    console.error("API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: `Something went wrong: ${message}` },
      { status: 500 }
    );
  }
}
