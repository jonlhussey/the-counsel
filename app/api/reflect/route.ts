// app/api/reflect/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/app/lib/systemPrompt";
import { getThinker } from "@/app/lib/thinkers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: buildSystemPrompt(thinker),
      messages: [
        {
          role: "user",
          content: `Scenario:\n\n${scenario}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json(
      { reflection: text, thinker: thinker.name, remaining },
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