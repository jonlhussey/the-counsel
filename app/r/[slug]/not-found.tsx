// app/r/[slug]/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen px-5 sm:px-8 py-16 max-w-3xl mx-auto flex flex-col items-center justify-center text-center">
      <p className="font-display text-sm tracking-[0.18em] uppercase text-muted mb-4">
        Not found
      </p>
      <h1 className="font-display text-3xl sm:text-4xl text-ink mb-4 leading-tight">
        This reflection has expired<br />
        <span className="italic text-secondary">or never existed.</span>
      </h1>
      <p className="text-secondary mb-8 max-w-sm leading-relaxed">
        Shared reflections are available for 90 days. This one may have
        expired, or the link may be incorrect.
      </p>
      <Link
        href="/"
        className="inline-block px-8 py-3 bg-ink text-canvas font-medium text-sm tracking-wide hover:bg-secondary transition-colors rounded"
      >
        Start a new reflection →
      </Link>
    </main>
  );
}
