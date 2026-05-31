"use client";

import Link from "next/link";
import type { SharedReflection } from "@/app/api/share/route";
import { Logo } from "@/app/components/Logo";

type Props = {
  data: SharedReflection;
  slug: string;
};

export function SharedReflectionView({ data, slug }: Props) {
  const shareUrl = `https://thecounsel.app/r/${slug}`;

  return (
    <main className="min-h-screen px-5 sm:px-8 py-12 sm:py-16 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <div className="mb-6">
          <Link href="/" aria-label="The Counsel — home">
            <Logo />
          </Link>
        </div>
        <p className="text-sm text-muted">A reflection shared from The Counsel</p>
      </header>

      {/* Shareable card — primary artifact */}
      <section className="mb-12">
        <SharedCard data={data} />
      </section>

      {/* Full reflection */}
      <section className="mb-16">
        <div className="mb-6 pb-3 border-b border-rule">
          <p className="font-display text-sm tracking-[0.18em] uppercase text-muted font-medium">
            The full reflection
          </p>
        </div>

        {data.mode === "single" ? (
          <SingleReflectionBody data={data} />
        ) : (
          <CouncilReflectionBody data={data} />
        )}
      </section>

      {/* CTA */}
      <section className="mb-16 py-10 border-t border-b border-rule text-center">
        <p className="font-display text-2xl sm:text-3xl text-ink mb-3 leading-snug">
          Bring your own question<br />
          <span className="italic text-secondary">to the thinkers.</span>
        </p>
        <p className="text-secondary text-base mb-6 max-w-sm mx-auto leading-relaxed">
          85 thinkers across history — from Marcus Aurelius to Hannah Arendt to
          James Baldwin. One question, one reflection.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-ink text-canvas font-medium text-sm tracking-wide hover:bg-secondary transition-colors rounded"
        >
          Try The Counsel →
        </Link>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-rule">
        <p className="text-xs text-muted leading-relaxed max-w-xl italic">
          The Counsel offers historically grounded interpretations of how
          various thinkers reasoned through ethical questions. Reflections are
          invitations, not instructions.
        </p>
        <p className="text-xs text-muted mt-2">
          This reflection was shared from{" "}
          <a href={shareUrl} className="underline underline-offset-2">
            {shareUrl}
          </a>
        </p>
      </footer>
    </main>
  );
}

// ── Shared card (mirrors ShareableCard but static/server-friendly) ──

function SharedCard({ data }: { data: SharedReflection }) {
  const { card } = data;
  return (
    <div className="shared-card">
      {/* Logo row */}
      <div className="shared-card-logo-row">
        <LogoMark />
        <span className="shared-card-wordmark">The Counsel</span>
        <span className="shared-card-tagline">reflections from history</span>
      </div>

      {/* Synopsis */}
      <div className="shared-card-section-label">Scenario</div>
      <p className="shared-card-synopsis">{card.synopsis}</p>

      {/* Voices */}
      <div className="shared-card-section-label">Reflecting</div>
      <p className="shared-card-voices">{card.voices}</p>

      {/* Pull quotes */}
      {card.pullQuotes?.length > 0 && (
        <div className="shared-card-quotes">
          {card.pullQuotes.map((q, i) => (
            <div key={i} className="shared-card-quote">
              <p className="shared-card-quote-text">&ldquo;{q.text}&rdquo;</p>
              <p className="shared-card-quote-attr">— {q.attribution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Synthesis */}
      {card.synthesis && (
        <>
          <div className="shared-card-section-label">Synthesis</div>
          <p className="shared-card-synthesis">{card.synthesis}</p>
        </>
      )}

      {/* Footer */}
      <p className="shared-card-footer">thecounsel.app</p>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden="true">
      <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <line x1="20" y1="55" x2="80" y2="55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="20" y1="68" x2="65" y2="68" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Full reflection bodies ──

function SingleReflectionBody({ data }: { data: SharedReflection }) {
  return (
    <div>
      {data.thinkerName && (
        <div className="mb-5 pb-4 border-b border-rule">
          <p className="font-mono text-[0.65rem] tracking-wider uppercase text-muted mb-1">
            Thinker
          </p>
          <p className="font-display text-xl text-ink">{data.thinkerName}</p>
        </div>
      )}
      {data.reflection && (
        <div className="reflection-content">
          <SimpleReflection text={data.reflection} />
        </div>
      )}
    </div>
  );
}

function CouncilReflectionBody({ data }: { data: SharedReflection }) {
  if (!data.reflections) return null;
  return (
    <div className="space-y-10">
      {data.reflections.map((r, i) => (
        <div key={i}>
          <p className="font-display text-xs tracking-[0.18em] uppercase text-muted font-medium mb-3">
            Voice {i + 1} of {data.reflections!.length}
          </p>
          <p className="font-display text-lg text-ink mb-4">{r.thinker}</p>
          <div className="reflection-content">
            <SimpleReflection text={r.reflection} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Simplified renderer for the shared page — no client hooks needed
function SimpleReflection({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith(">")) {
          const content = block.split("\n").map((l) => l.replace(/^>\s?/, "")).join(" ");
          return <blockquote key={i}>{content}</blockquote>;
        }
        const sectionMatch = block.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
        if (sectionMatch) {
          const [, label, rest] = sectionMatch;
          return (
            <div key={i}>
              <strong>{label}</strong>
              {rest.trim() && <p>{rest.trim().replace(/^\[INFERENCE\]\s*/i, "")}</p>}
            </div>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </>
  );
}
