"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { ThinkerBrowser } from "./components/ThinkerBrowser";
import { ThinkerCard } from "./components/ThinkerCard";
import { FormattedReflection } from "./components/FormattedReflection";
import { ShareableCard } from "./components/ShareableCard";
import { Logo } from "./components/Logo";
import { getThinker } from "@/app/lib/thinkers";
import type { CardData } from "@/app/lib/parseCard";

type Mode = "single" | "council";
type Picker = "user" | "auto";

type SingleResult = {
  mode: "single";
  thinkerId: string;
  thinkerName: string;
  scenario: string;
  reflection: string;
  card: CardData;
};

type CouncilResult = {
  mode: "council";
  thinkerIds: string[];
  reflections: { thinker: string; reflection: string }[];
  scenario: string;
  card: CardData;
};

type Result = SingleResult | CouncilResult;

type HistoryItem = Result & {
  id: string;
  timestamp: number;
};

const STORAGE_KEY = "counsel-history-v2"; // bumped from v1 due to shape change
const MAX_HISTORY = 50;

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("single");
  const [picker, setPicker] = useState<Picker>("user");
  const [scenario, setScenario] = useState("");
  const [thinkerId, setThinkerId] = useState<string | null>(null); // for single
  const [councilThinkerIds, setCouncilThinkerIds] = useState<string[]>([]); // for council manual
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserMode, setBrowserMode] = useState<"single" | "council">("single");

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  function saveToHistory(r: Result) {
    const newItem: HistoryItem = {
      ...r,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    const next = [newItem, ...history].slice(0, MAX_HISTORY);
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function deleteHistoryItem(id: string) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function clearHistory() {
    if (!confirm("Clear all saved reflections? This cannot be undone.")) return;
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function loadFromHistory(item: HistoryItem) {
    setMode(item.mode);
    setScenario(item.scenario);
    if (item.mode === "single") {
      setThinkerId(item.thinkerId);
    } else {
      setCouncilThinkerIds(item.thinkerIds);
    }
    setResult(item);
    setShowHistory(false);
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function startNew() {
    setScenario("");
    setThinkerId(null);
    setCouncilThinkerIds([]);
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      const ta = document.getElementById("scenario") as HTMLTextAreaElement | null;
      ta?.focus();
    }, 600);
  }

  function openBrowser(forMode: "single" | "council") {
    setBrowserMode(forMode);
    setShowBrowser(true);
  }

  function handleBrowserSelect(id: string) {
    if (browserMode === "single") {
      setThinkerId(id);
      setShowBrowser(false);
    } else {
      // Council manual: collect 3 ids
      setCouncilThinkerIds((prev) => {
        if (prev.includes(id)) {
          // Toggle off
          return prev.filter((x) => x !== id);
        }
        if (prev.length >= 3) {
          return prev; // already have 3
        }
        const next = [...prev, id];
        if (next.length === 3) {
          setShowBrowser(false);
        }
        return next;
      });
    }
  }

  // Validation: do we have what we need to submit?
  function canSubmit(): boolean {
    if (!scenario.trim() || loading) return false;
    if (mode === "single" && picker === "user" && !thinkerId) return false;
    if (mode === "council" && picker === "user" && councilThinkerIds.length !== 3) return false;
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "single") {
        // For "auto" picker in single mode, we need to ask the API to pick.
        // Reuse the council suggestion logic via a one-thinker variant by
        // sending a flag. Simpler: just call council suggest endpoint —
        // but we don't have one. Inline the logic in the API. For now we
        // pick client-side from a tiny prompt OR ask council to pick 1.
        // Cleanest: have reflect API accept thinkerId="auto" and pick server-side.
        let useThinkerId = thinkerId;
        if (picker === "auto") {
          // Call the auto-pick endpoint
          const pickRes = await fetch("/api/pick-thinker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scenario.trim(), count: 1 }),
          });
          const pickData = await pickRes.json();
          if (!pickRes.ok) {
            setError(pickData.error || "Could not pick a thinker.");
            return;
          }
          useThinkerId = pickData.thinkerIds[0];
        }

        const res = await fetch("/api/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: scenario.trim(), thinkerId: useThinkerId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        const r: SingleResult = {
          mode: "single",
          thinkerId: useThinkerId!,
          thinkerName: data.thinker,
          scenario: scenario.trim(),
          reflection: data.reflection,
          card: data.card,
        };
        setResult(r);
        saveToHistory(r);
      } else {
        // Council mode
        const body: { scenario: string; thinkerIds?: string[] } = {
          scenario: scenario.trim(),
        };
        if (picker === "user") {
          body.thinkerIds = councilThinkerIds;
        }
        const res = await fetch("/api/council", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        const r: CouncilResult = {
          mode: "council",
          thinkerIds: data.thinkerIds,
          reflections: data.reflections,
          scenario: scenario.trim(),
          card: data.card,
        };
        setResult(r);
        saveToHistory(r);
      }

      setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedThinker = thinkerId ? getThinker(thinkerId) : null;

  return (
    <main className="relative min-h-screen px-5 sm:px-8 py-12 sm:py-16 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-12 sm:mb-16 animate-fade-in">
        <div className="mb-10">
          <Logo onClick={startNew} />
        </div>

        <h1 className="font-display font-normal text-ink leading-[0.95] tracking-tight text-5xl sm:text-7xl md:text-[5.5rem] mb-6">
          What would
          <br />
          <span className="italic text-secondary">they</span> do?
        </h1>

        <p className="text-secondary text-base sm:text-lg leading-relaxed max-w-xl">
          Describe a scenario. Receive a reflection grounded in the writings
          of one of history's great thinkers — or summon a council of three
          to weigh in.
        </p>
      </header>

      {/* Mode toggle */}
      <section className="mb-8 animate-slide-up">
        <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
          Mode
        </p>
        <div className="mode-toggle">
          <button
            onClick={() => { setMode("single"); setResult(null); }}
            className={mode === "single" ? "active" : ""}
          >
            One thinker
          </button>
          <button
            onClick={() => { setMode("council"); setResult(null); }}
            className={mode === "council" ? "active" : ""}
          >
            Council of three
          </button>
        </div>
      </section>

      {/* Picker toggle: I'll choose vs Surprise me */}
      <section className="mb-8 animate-slide-up">
        <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
          {mode === "single" ? "Who will reflect?" : "Who will be on the council?"}
        </p>
        <div className="mode-toggle">
          <button
            onClick={() => setPicker("user")}
            className={picker === "user" ? "active" : ""}
          >
            I&apos;ll choose
          </button>
          <button
            onClick={() => setPicker("auto")}
            className={picker === "auto" ? "active" : ""}
          >
            Surprise me
          </button>
        </div>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          {mode === "single" && picker === "user" && "Pick one thinker from the roster."}
          {mode === "single" && picker === "auto" && "After you describe your scenario, The Counsel will choose a thinker whose writings best fit."}
          {mode === "council" && picker === "user" && "Pick three thinkers — they need not share a tradition."}
          {mode === "council" && picker === "auto" && "After you describe your scenario, The Counsel will choose three thinkers from different traditions."}
        </p>
      </section>

      {/* Thinker selection (only when picker = user) */}
      {picker === "user" && mode === "single" && (
        <section className="mb-8 animate-slide-up">
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
            Thinker
          </p>
          {selectedThinker && !showBrowser ? (
            <div className="relative">
              <ThinkerCard thinker={selectedThinker} variant="result" />
              <button
                onClick={() => openBrowser("single")}
                className="absolute top-4 right-4 text-xs uppercase tracking-wider text-secondary hover:text-ink underline underline-offset-4 whitespace-nowrap bg-surface px-2 py-1 rounded"
              >
                Change
              </button>
            </div>
          ) : showBrowser ? (
            <ThinkerBrowser
              onSelect={handleBrowserSelect}
              onClose={() => setShowBrowser(false)}
              selectedIds={[]}
              maxSelection={1}
            />
          ) : (
            <button
              onClick={() => openBrowser("single")}
              className="w-full bg-surface border border-rule rounded p-5 text-left hover:border-ink transition-colors"
            >
              <p className="font-display text-lg text-ink mb-1">
                Browse 85 thinkers →
              </p>
              <p className="text-sm text-muted">
                Searchable, filterable by tradition.
              </p>
            </button>
          )}
        </section>
      )}

      {picker === "user" && mode === "council" && (
        <section className="mb-8 animate-slide-up">
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
            Three thinkers
          </p>
          {showBrowser ? (
            <ThinkerBrowser
              onSelect={handleBrowserSelect}
              onClose={() => setShowBrowser(false)}
              selectedIds={councilThinkerIds}
              maxSelection={3}
            />
          ) : councilThinkerIds.length > 0 ? (
            <div className="space-y-3">
              {councilThinkerIds.map((id) => {
                const t = getThinker(id);
                if (!t) return null;
                return (
                  <div key={id} className="relative">
                    <ThinkerCard thinker={t} variant="result" />
                    <button
                      onClick={() =>
                        setCouncilThinkerIds((prev) => prev.filter((x) => x !== id))
                      }
                      className="absolute top-4 right-4 text-xs uppercase tracking-wider text-secondary hover:text-red-700 underline underline-offset-4 bg-surface px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => openBrowser("council")}
                className="w-full bg-surface border border-rule rounded p-4 text-left hover:border-ink transition-colors"
              >
                <p className="font-display text-base text-ink">
                  {councilThinkerIds.length < 3
                    ? `Add ${3 - councilThinkerIds.length} more →`
                    : "Change selection →"}
                </p>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openBrowser("council")}
              className="w-full bg-surface border border-rule rounded p-5 text-left hover:border-ink transition-colors"
            >
              <p className="font-display text-lg text-ink mb-1">
                Pick three thinkers →
              </p>
              <p className="text-sm text-muted">
                Selected thinkers will appear here.
              </p>
            </button>
          )}
        </section>
      )}

      {/* Scenario input */}
      <section className="mb-8">
        <form onSubmit={handleSubmit}>
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
            Your scenario
          </p>
          <div className="bg-surface border border-rule rounded overflow-hidden">
            <div className="px-4 py-2 border-b border-rule flex justify-between items-center bg-canvas">
              <span className="font-mono text-[0.65rem] tracking-wider uppercase text-muted">
                Describe the situation
              </span>
              <span className="font-mono text-xs text-muted">
                {scenario.length} / 2000
              </span>
            </div>
            <textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="A coworker took credit for my work in front of our manager. I'm hurt and angry, and tomorrow we have a meeting together..."
              rows={5}
              maxLength={2000}
              disabled={loading}
              className="w-full px-4 py-4 bg-surface text-ink placeholder:text-muted/70 focus:outline-none resize-none font-sans text-lg leading-relaxed"
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-secondary hover:text-ink underline-offset-4 hover:underline"
            >
              {showHistory ? "Hide" : "View"} past reflections
              {history.length > 0 && (
                <span className="ml-1 text-xs text-muted">
                  ({history.length})
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={!canSubmit()}
              className="px-7 py-3 bg-ink text-canvas font-medium text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors rounded"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  {mode === "council" ? "Convening" : "Reflecting"}
                  <span className="dot-1">.</span>
                  <span className="dot-2">.</span>
                  <span className="dot-3">.</span>
                </span>
              ) : (
                <>{mode === "council" ? "Convene the council →" : "Seek a reflection →"}</>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* History panel */}
      {showHistory && (
        <section className="mb-10 animate-slide-up">
          <div className="border-t border-b border-rule py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium">
                Past reflections
              </p>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted hover:text-red-700"
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted italic">
                No reflections yet. Your saved scenarios will appear here.
              </p>
            ) : (
              <ul className="space-y-1 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-start gap-3 py-2 hover:bg-surface rounded px-2 -mx-2 transition-colors"
                  >
                    <button
                      onClick={() => loadFromHistory(item)}
                      className="flex-1 text-left"
                    >
                      <p className="font-mono text-[0.65rem] tracking-wider uppercase text-muted mb-0.5">
                        {item.mode === "single"
                          ? item.thinkerName
                          : `Council · ${item.reflections.map((r) => r.thinker).join(", ")}`}
                      </p>
                      <p className="text-sm text-ink line-clamp-2 leading-snug">
                        {item.scenario}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                    <button
                      onClick={() => deleteHistoryItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-sm text-muted hover:text-red-700 transition-all px-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <div className="mb-8 p-4 border border-red-300 bg-red-50/50 text-red-900 text-sm rounded animate-slide-up">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <section ref={responseRef} className="mb-12 animate-slide-up">
          {/* Header bar */}
          <div className="border-t border-rule pt-8 mb-8 flex items-center justify-between gap-4 flex-wrap">
            <p className="font-display text-sm tracking-[0.18em] uppercase text-muted font-medium">
              {result.mode === "single" ? "A reflection from" : "The Counsel convenes"}
            </p>
            <button
              onClick={startNew}
              className="text-sm text-secondary hover:text-ink underline-offset-4 hover:underline"
            >
              ← Start new
            </button>
          </div>

          {/* THE SHAREABLE CARD — the primary artifact */}
          <ShareableCard card={result.card} />

          {/* The longer reflection(s) below — for those who want depth */}
          <div className="mt-16">
            <div className="mb-6 pb-3 border-b border-rule">
              <p className="font-display text-sm tracking-[0.18em] uppercase text-muted font-medium">
                The full reflection
              </p>
            </div>
            {result.mode === "single" ? (
              <SingleResultDisplay result={result} />
            ) : (
              <CouncilDisplay result={result} />
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 pt-8 border-t border-rule flex justify-center">
            <button
              onClick={startNew}
              className="px-8 py-3 bg-ink text-canvas font-medium text-sm tracking-wide hover:bg-secondary transition-colors rounded"
            >
              {result.mode === "single" ? "Seek another reflection" : "Convene a new council"}
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-24 pt-8 border-t border-rule">
        <p className="text-sm text-muted leading-relaxed max-w-xl italic">
          The Counsel offers historically grounded interpretations of how
          various thinkers reasoned through ethical questions. It does not
          claim to know what they would say — only what their writings
          suggest they valued. Reflections are invitations, not instructions.
        </p>
      </footer>
    </main>
  );
}

function SingleResultDisplay({ result }: { result: SingleResult }) {
  const thinker = getThinker(result.thinkerId);
  return (
    <div>
      {thinker && (
        <div className="mb-8">
          <ThinkerCard thinker={thinker} variant="result" />
        </div>
      )}
      <div className="reflection-content">
        <FormattedReflection text={result.reflection} />
      </div>
    </div>
  );
}

function CouncilDisplay({ result }: { result: CouncilResult }) {
  return (
    <div className="space-y-10">
      {result.reflections.map((r, i) => {
        const thinker = result.thinkerIds[i] ? getThinker(result.thinkerIds[i]) : null;
        return (
          <div key={i} className={`animate-stagger-${i + 1}`}>
            <p className="font-display text-xs tracking-[0.18em] uppercase text-muted font-medium mb-3">
              Voice {i + 1} of 3
            </p>
            {thinker && (
              <div className="mb-6">
                <ThinkerCard thinker={thinker} variant="result" />
              </div>
            )}
            <div className="reflection-content pl-1">
              <FormattedReflection text={r.reflection} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
