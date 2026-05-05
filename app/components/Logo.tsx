"use client";

/**
 * The Counsel logo. Three vertical lines (a council of three / classical columns)
 * paired with the wordmark. The whole thing acts as a home link.
 *
 * Sizes:
 *   - "small" — for headers, ~32px tall mark
 *   - "favicon" — just the mark, square format
 */

export function Logo({
  variant = "header",
  onClick,
}: {
  variant?: "header" | "favicon";
  onClick?: () => void;
}) {
  if (variant === "favicon") {
    return <LogoMark size={32} />;
  }

  return (
    <a
      href="/"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className="inline-flex items-center gap-3 group"
      aria-label="The Counsel — home"
    >
      <LogoMark size={28} />
      <span className="font-display text-xl sm:text-2xl font-normal text-ink leading-none tracking-tight group-hover:text-secondary transition-colors">
        The Counsel
      </span>
    </a>
  );
}

function LogoMark({ size = 28 }: { size?: number }) {
  // Aspect: 80 wide × 100 tall, but we render at given height
  const width = (size * 80) / 100;
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <line
        x1="14"
        y1="20"
        x2="14"
        y2="80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="40"
        y1="14"
        x2="40"
        y2="86"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="66"
        y1="20"
        x2="66"
        y2="80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
