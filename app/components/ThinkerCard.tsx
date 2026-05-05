"use client";

import type { Thinker } from "@/app/lib/thinkers";

/**
 * A "baseball card" for a thinker — name, era, tradition, bio, Wikipedia link.
 *
 * Variants:
 *  - "browse"  — used in the browser grid. No Wikipedia link (the whole card
 *                is a clickable button); subtle hover state.
 *  - "result"  — used at the top of a reflection. Includes Wikipedia link
 *                and is non-clickable.
 */
export function ThinkerCard({
  thinker,
  variant = "browse",
}: {
  thinker: Thinker;
  variant?: "browse" | "result";
}) {
  const isBrowse = variant === "browse";

  return (
    <article
      className={`
        bg-surface border border-rule rounded-md p-5 sm:p-6 h-full
        ${isBrowse ? "transition-all group-hover:border-ink group-hover:-translate-y-0.5" : ""}
      `}
    >
      <div className="mb-3">
        <p className="text-xs tracking-[0.15em] uppercase text-muted mb-2 font-medium">
          {thinker.tradition}
        </p>
        <h3 className="font-display text-2xl sm:text-[1.75rem] font-medium leading-tight text-ink mb-1">
          {thinker.name}
        </h3>
        <p className="text-sm text-secondary">{thinker.era}</p>
      </div>

      <p className="text-[0.9375rem] leading-relaxed text-secondary mb-4">
        {thinker.bio}
      </p>

      {variant === "result" && (
        <a
          href={`https://en.wikipedia.org/wiki/${thinker.wikipedia}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-ink underline underline-offset-4 hover:text-secondary transition-colors"
        >
          View on Wikipedia
          <span aria-hidden="true" className="text-xs">↗</span>
        </a>
      )}
    </article>
  );
}
