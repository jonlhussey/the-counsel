// app/r/[slug]/page.tsx
// Public page for a shared reflection.
// Fetches from Vercel KV, renders the shareable card + full reflection + CTA.

import { Metadata } from "next";
import { kv } from "@vercel/kv";
import { notFound } from "next/navigation";
import type { SharedReflection } from "@/app/api/share/route";
import { SharedReflectionView } from "./SharedReflectionView";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const data = await kv.get<SharedReflection>(params.slug);
    if (!data) return { title: "The Counsel" };

    const thinkerLabel =
      data.mode === "single"
        ? data.thinkerName ?? "A thinker"
        : data.thinkerIds?.length
        ? `A council of ${data.thinkerIds.length}`
        : "The Counsel";

    return {
      title: `${data.card.synopsis.slice(0, 60)}… — The Counsel`,
      description: `${thinkerLabel} reflects: ${data.card.synthesis?.slice(0, 120)}…`,
      openGraph: {
        title: `${thinkerLabel} on The Counsel`,
        description: data.card.synopsis,
        url: `https://thecounsel.app/r/${params.slug}`,
        type: "article",
        images: [
          {
            url: `https://thecounsel.app/api/og?synopsis=${encodeURIComponent(data.card.synopsis)}&voices=${encodeURIComponent(data.card.voices)}&quoteText=${encodeURIComponent(data.card.pullQuotes[0]?.text ?? "")}&quoteCitation=${encodeURIComponent(data.card.pullQuotes[0]?.attribution ?? "")}&synthesis=${encodeURIComponent(data.card.synthesis ?? "")}`,
            width: 1080,
            height: 1080,
            alt: data.card.synopsis,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${thinkerLabel} on The Counsel`,
        description: data.card.synopsis,
      },
    };
  } catch {
    return { title: "The Counsel" };
  }
}

export default async function SharedReflectionPage({ params }: Props) {
  let data: SharedReflection | null = null;

  try {
    data = await kv.get<SharedReflection>(params.slug);
  } catch {
    // KV not configured or other error — show not found
  }

  if (!data) notFound();

  return <SharedReflectionView data={data} slug={params.slug} />;
}
