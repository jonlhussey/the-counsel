"use client";

import { useState } from "react";
import type { CardData } from "@/app/lib/parseCard";

/**
 * The shareable card. Mirrors the PNG layout closely so users see
 * what they're about to download.
 */
export function ShareableCard({ card }: { card: CardData }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isCouncil = card.voices.length > 1;
  const quotesToShow = card.pullQuotes.slice(0, isCouncil ? 2 : 1);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const quotesParam = card.pullQuotes
        .map((q) => `${q.text}~~${q.attribution}`)
        .join("|||");

      const params = new URLSearchParams({
        synopsis: card.synopsis,
        voices: card.voices.join("|"),
        synthesis: card.synthesis,
        quotes: quotesParam,
      });

      const url = `/api/og?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate image");
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "the-counsel-reflection.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyText() {
    const text = [
      `Scenario: ${card.synopsis}`,
      "",
      isCouncil ? `A council of: ${card.voices.join(", ")}` : `Reflection from ${card.voices[0]}`,
      "",
      ...card.pullQuotes.map(
        (q) => `"${q.text}" — ${q.attribution}`
      ),
      card.pullQuotes.length > 0 ? "" : "",
      card.synthesis,
      "",
      "— via The Counsel · www.thecounsel.app",
    ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* The visual card */}
      <article className="bg-canvas border-2 border-ink rounded-lg p-7 sm:p-9">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 mb-7">
          <svg
            width="22"
            height="28"
            viewBox="0 0 80 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="14" y1="20" x2="14" y2="80" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
            <line x1="40" y1="14" x2="40" y2="86" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
            <line x1="66" y1="20" x2="66" y2="80" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
          </svg>
          <span className="font-display text-lg leading-none text-ink">
            The Counsel
          </span>
        </div>

        {/* Synopsis */}
        <div className="mb-6">
          <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase text-muted mb-2 font-medium">
            Scenario
          </p>
          <p className="font-display text-xl sm:text-2xl leading-snug text-ink">
            {card.synopsis}
          </p>
        </div>

        {/* Voices */}
        <div className="mb-6">
          <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase text-muted mb-2 font-medium">
            {isCouncil ? "A council of three" : "Reflection from"}
          </p>
          <p className="font-display italic text-lg sm:text-xl leading-snug text-secondary">
            {card.voices.join("  ·  ")}
          </p>
        </div>

        {/* Pull quotes */}
        {quotesToShow.length > 0 && (
          <div className="space-y-4 mb-6">
            {quotesToShow.map((q, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-ink pl-4 py-0.5"
              >
                <p className="font-display italic text-base sm:text-lg leading-snug text-ink mb-1">
                  &ldquo;{q.text}&rdquo;
                </p>
                <p className="font-sans text-xs text-muted">
                  — {q.attribution}
                  {q.isParaphrase && (
                    <span className="ml-2 italic">[paraphrase]</span>
                  )}
                </p>
              </blockquote>
            ))}
          </div>
        )}

        {/* Synthesis */}
        {card.synthesis && (
          <div className="mb-6">
            <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase text-muted mb-2 font-medium">
              Synthesis
            </p>
            <p className="font-display text-base sm:text-[1.0625rem] leading-relaxed text-ink">
              {card.synthesis}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-rule pt-3 mt-2 flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-muted">
            www.thecounsel.app
          </span>
          <span className="font-mono text-[0.625rem] tracking-[0.2em] uppercase text-muted">
            Reflections from history
          </span>
        </div>
      </article>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted italic">
          Share this reflection on social.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="font-sans text-sm px-4 py-2 border border-rule rounded hover:border-ink transition-colors"
          >
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="font-sans text-sm px-4 py-2 bg-ink text-canvas rounded hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {downloading ? "Generating..." : "Download image"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 italic">{error}</p>
      )}
    </div>
  );
}
