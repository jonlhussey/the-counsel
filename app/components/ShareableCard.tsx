"use client";

import { useState, useEffect } from "react";
import type { CardData } from "@/app/lib/parseCard";

type Props = {
  card: CardData;
  reflectionPayload: ReflectionPayload;
};

export type ReflectionPayload = {
  mode: "single" | "council";
  scenario: string;
  card: CardData;
  thinkerId?: string;
  thinkerName?: string;
  reflection?: string;
  thinkerIds?: string[];
  reflections?: Array<{ thinker: string; reflection: string }>;
};

export function ShareableCard({ card, reflectionPayload }: Props) {
  const [supportsShare, setSupportsShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    setSupportsShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
    );
  }, []);

  async function ensureShareUrl(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    setGenerating(true);
    setLinkError(false);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reflectionPayload),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setShareUrl(data.url);
        setShareSlug(data.slug);
        return data.url;
      }
      setLinkError(true);
    } catch {
      setLinkError(true);
    } finally {
      setGenerating(false);
    }
    return null;
  }

  async function downloadImage() {
    const params = new URLSearchParams({
      synopsis: card.synopsis,
      voices: Array.isArray(card.voices) ? card.voices.join(" | ") : card.voices,
      quoteText: card.pullQuotes[0]?.text ?? "",
      quoteCitation: card.pullQuotes[0]?.attribution ?? "",
      synthesis: card.synthesis ?? "",
    });
    const res = await fetch("/api/og?" + params.toString());
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "the-counsel-reflection.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleShare() {
    setGenerating(true);
    try {
      const url = await ensureShareUrl();
      const params = new URLSearchParams({
        synopsis: card.synopsis,
        voices: Array.isArray(card.voices) ? card.voices.join(" | ") : card.voices,
        quoteText: card.pullQuotes[0]?.text ?? "",
        quoteCitation: card.pullQuotes[0]?.attribution ?? "",
        synthesis: card.synthesis ?? "",
      });
      const imgRes = await fetch("/api/og?" + params.toString());
      const imgBlob = await imgRes.blob();
      const imgFile = new File([imgBlob], "reflection.png", { type: "image/png" });
      const shareDataWithFile: ShareData = { files: [imgFile] };
      if (url) shareDataWithFile.url = url;
      if (navigator.canShare && navigator.canShare(shareDataWithFile)) {
        await navigator.share(shareDataWithFile);
        return;
      }
      if (url) {
        await navigator.share({ url, title: "A reflection from The Counsel" });
        return;
      }
      await navigator.share({ title: "A reflection from The Counsel", text: card.synopsis });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyLink() {
    const url = await ensureShareUrl();
    if (!url) {
      const text = [
        card.synopsis,
        card.voices,
        ...card.pullQuotes.map((q) => '"' + q.text + '" — ' + q.attribution),
        card.synthesis,
        "thecounsel.app",
      ].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(text);
    } else {
      await navigator.clipboard.writeText(url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div>
      <div className="shareable-card-wrapper">
        <div className="sc-logo-row">
          <CardLogoMark />
          <span className="sc-wordmark">The Counsel</span>
          <span className="sc-tagline">reflections from history</span>
        </div>
        <div className="sc-label">Scenario</div>
        <p className="sc-synopsis">{card.synopsis}</p>
        <div className="sc-label">Reflecting</div>
        <p className="sc-voices">{Array.isArray(card.voices) ? card.voices.join(" | ") : card.voices}</p>
        {card.pullQuotes?.length > 0 && (
          <div className="sc-quotes">
            {card.pullQuotes.map((q, i) => (
              <div key={i} className="sc-quote-block">
                <p className="sc-quote-text">&ldquo;{q.text}&rdquo;</p>
                <p className="sc-quote-attr">— {q.attribution}</p>
              </div>
            ))}
          </div>
        )}
        {card.synthesis && (
          <>
            <div className="sc-label">Synthesis</div>
            <p className="sc-synthesis">{card.synthesis}</p>
          </>
        )}
        <p className="sc-footer">thecounsel.app</p>
      </div>
      {shareSlug && (
        <div className="sc-slug-badge">
          <span className="sc-slug-icon">🔗</span>
          <span className="sc-slug-url">thecounsel.app/r/{shareSlug}</span>
        </div>
      )}
      {linkError && (
        <p className="text-xs text-muted italic mb-2">
          Link sharing unavailable — copied card text instead.
        </p>
      )}
      <div className="sc-actions">
        <button onClick={handleCopyLink} disabled={generating} className="sc-btn-secondary">
          {generating ? "Generating…" : copied ? "Copied ✓" : "Copy link"}
        </button>
        <button onClick={downloadImage} className="sc-btn-secondary">
          Download image
        </button>
        {supportsShare && (
          <button onClick={handleShare} disabled={generating} className="sc-btn-primary">
            {generating ? (
              <span className="flex items-center gap-1.5">
                Creating<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span>
              </span>
            ) : "Share \u2197"}
          </button>
        )}
      </div>
    </div>
  );
}

function CardLogoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 100 100" aria-hidden="true" style={{ color: "var(--ink)", flexShrink: 0 }}>
      <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <line x1="20" y1="55" x2="80" y2="55" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="20" y1="68" x2="65" y2="68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
