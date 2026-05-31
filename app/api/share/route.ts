// app/api/share/route.ts
// Saves a reflection to Vercel KV and returns a two-word slug URL.
// The slug is deterministic from reflection content, so sharing the
// same reflection twice returns the same URL.

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { generateUniqueSlug } from "@/app/lib/slugs";

export const runtime = "nodejs";
export const maxDuration = 10;

// Reflections expire after 90 days — enough for sharing without
// accumulating data indefinitely.
const TTL_SECONDS = 60 * 60 * 24 * 90;

export type SharedReflection = {
  mode: "single" | "council";
  scenario: string;
  card: {
    synopsis: string;
    voices: string;
    pullQuotes: Array<{ text: string; attribution: string }>;
    synthesis: string;
  };
  // Single mode
  thinkerId?: string;
  thinkerName?: string;
  reflection?: string;
  // Council mode
  thinkerIds?: string[];
  reflections?: Array<{ thinker: string; reflection: string }>;
  createdAt: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<SharedReflection, "createdAt">;

    if (!body.scenario || !body.card || !body.mode) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Generate a deterministic seed from the scenario + first voice
    const seed = `${body.scenario.slice(0, 80)}-${body.card.synopsis.slice(0, 40)}`;

    // Try up to 5 slugs to avoid collisions
    let slug: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateUniqueSlug(seed, attempt);
      // Check if this slug is already taken by a DIFFERENT reflection
      const existing = await kv.get<SharedReflection>(candidate);
      if (!existing) {
        slug = candidate;
        break;
      }
      // If it's the same scenario (re-share), reuse the slug
      if (existing.scenario === body.scenario) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      // Fallback: use timestamp-based slug
      slug = generateUniqueSlug(`${seed}-${Date.now()}`);
    }

    const payload: SharedReflection = {
      ...body,
      createdAt: new Date().toISOString(),
    };

    await kv.set(slug, payload, { ex: TTL_SECONDS });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thecounsel.app";
    return NextResponse.json({
      slug,
      url: `${baseUrl}/r/${slug}`,
    });
  } catch (err) {
    console.error("Share API error:", err);
    // If KV is not configured, return a graceful error rather than crashing
    if (err instanceof Error && err.message.includes("KV")) {
      return NextResponse.json(
        { error: "Sharing is not configured yet." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not create share link." },
      { status: 500 }
    );
  }
}
