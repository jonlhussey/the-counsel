"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { ThinkerBrowser } from "./components/ThinkerBrowser";
import { FormattedReflection } from "./components/FormattedReflection";
import { getThinker } from "@/app/lib/thinkers";

type Mode = "single" | "council";

type SingleResult = {
  mode: "single";
  thinkerId: string;
  thinkerName: string;
  scenario: string;
  reflection: string;
};

type CouncilResult = {
  mode: "council";
  thinkerIds: string[];
  reflections: { thinker: string; reflection: string }[];
  scenario: string;
  synthesis: string;
};

type Result = SingleResult | CouncilResult;

type HistoryItem = Result & {
  id: string;
  timestamp: number;
};

const STORAGE_KEY = "counsel-history-v1";
const MAX_HISTORY = 50;

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("single");
  const [scenario, setScenario] = useState("");
  const [thinkerId, setThinkerId] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
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
    setResult(null);
    setError(null);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      const ta = document.getElementById("scenario") as HTMLTextAreaElement | null;
      ta?.focus();
    }, 600);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scenario.trim() || loading) return;
    if (mode === "single" && !thinkerId) {
      setError("Choose a thinker first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "single") {
        const res = await fetch("/api/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: scenario.trim(), thinkerId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        const r: SingleResult = {
          mode: "single",
          thinkerId: thinkerId!,
          thinkerName: data.thinker,
          scenario: scenario.trim(),
          reflection: data.reflection,
        };
        setResult(r);
        saveToHistory(r);
      } else {
        const res = await fetch("/api/council", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: scenario.trim() }),
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
          synthesis: data.synthesis,
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

  function copyResult() {
    if (!result) return;
    let text = `Scenario: ${result.scenario}\n\n`;
    if (result.mode === "single") {
      text += `Reflection from ${result.thinkerName}:\n\n${result.reflection}`;
    } else {
      for (const r of result.reflections) {
        text += `=== ${r.thinker} ===\n${r.reflection}\n\n`;
      }
      text += `=== Synthesis ===\n${result.synthesis}`;
    }
    text += `\n\n— The Counsel`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareTwitter() {
    if (!result) return;
    let snippet = "";
    if (result.mode === "single") {
      snippet = result.reflection
        .replace(/\*\*/g, "")
        .replace(/^>/gm, "")
        .replace(/\[INFERENCE\]/gi, "")
        .replace(/\n+/g, " ")
        .slice(0, 180)
        .trim();
      const text = encodeURIComponent(
        `"${snippet}..." — ${result.thinkerName}, via The Counsel`
      );
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    } else {
      const names = result.reflections.map((r) => r.thinker).join(", ");
      const text = encodeURIComponent(
        `A council of ${names} reflecting on: "${result.scenario.slice(0, 100)}..." — via The Counsel`
      );
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    }
  }

  function shareFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  }

  const selectedThinker = thinkerId ? getThinker(thinkerId) : null;

  return (
    <main className="relative min-h-screen px-5 sm:px-8 py-12 sm:py-16 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-12 sm:mb-16 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
          <span className="font-mono text-xs tracking-wider uppercase text-secondary">
            The Counsel · Reflections from history's thinkers
          </span>
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
        <p className="font-mono text-xs tracking-wider uppercase text-muted mb-3">
          Mode
        </p>
        <div className="mode-toggle">
          <button
            onClick={() => setMode("single")}
            className={mode === "single" ? "active" : ""}
          >
            One thinker
          </button>
          <button
            onClick={() => setMode("council")}
            className={mode === "council" ? "active" : ""}
          >
            Council of three
          </button>
        </div>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          {mode === "single"
            ? "Choose a thinker. Their reflection will draw from their primary writings."
            : "The Counsel will pick three thinkers from different traditions, then synthesize where they converge and diverge."}
        </p>
      </section>

      {/* Thinker selection (single mode only) */}
      {mode === "single" && (
        <section className="mb-8 animate-slide-up">
          <p className="font-mono text-xs tracking-wider uppercase text-muted mb-3">
            Thinker
          </p>
          {selectedThinker && !showBrowser ? (
            <div className="bg-surface border border-rule rounded p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl font-medium text-ink leading-tight">
                  {selectedThinker.name}
                </p>
                <p className="font-mono text-xs text-muted mt-1">
                  {selectedThinker.era} · {selectedThinker.tradition}
                </p>
                <p className="text-sm text-secondary mt-2 leading-snug">
                  {selectedThinker.framing}
                </p>
              </div>
              <button
                onClick={() => setShowBrowser(true)}
                className="font-mono text-xs uppercase tracking-wider text-secondary hover:text-ink underline underline-offset-4 whitespace-nowrap"
              >
                Change
              </button>
            </div>
          ) : showBrowser ? (
            <ThinkerBrowser
              onSelect={(id) => {
                setThinkerId(id);
                setShowBrowser(false);
              }}
              onClose={() => setShowBrowser(false)}
            />
          ) : (
            <button
              onClick={() => setShowBrowser(true)}
              className="w-full bg-surface border border-rule rounded p-4 text-left hover:border-ink transition-colors"
            >
              <p className="font-display text-base text-secondary">
                Browse 80 thinkers →
              </p>
              <p className="text-sm text-muted mt-1">
                Searchable, filterable by tradition. List or grid view.
              </p>
            </button>
          )}
        </section>
      )}

      {/* Scenario input */}
      <section className="mb-8">
        <form onSubmit={handleSubmit}>
          <p className="font-mono text-xs tracking-wider uppercase text-muted mb-3">
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
              disabled={
                loading ||
                !scenario.trim() ||
                (mode === "single" && !thinkerId)
              }
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
              <p className="font-mono text-xs tracking-wider uppercase text-muted">
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
          <div className="border-t border-rule pt-8 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <p className="font-mono text-xs tracking-wider uppercase text-muted">
              {result.mode === "single"
                ? `Reflection from ${result.thinkerName}`
                : "The Counsel convenes"}
            </p>
            <button
              onClick={startNew}
              className="text-sm text-secondary hover:text-ink underline-offset-4 hover:underline"
            >
              ← Start new
            </button>
          </div>

          {result.mode === "single" ? (
            <div className="reflection-content">
              <FormattedReflection text={result.reflection} />
            </div>
          ) : (
            <CouncilDisplay result={result} />
          )}

          {/* Action bar */}
          <div className="mt-12 pt-8 border-t border-rule flex flex-col items-center gap-6">
            <button
              onClick={startNew}
              className="px-8 py-3 bg-ink text-canvas font-medium text-sm tracking-wide hover:bg-secondary transition-colors rounded"
            >
              {result.mode === "single" ? "Seek another reflection" : "Convene a new council"}
            </button>

            <div className="w-full flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted italic">
                Share this reflection with someone who might appreciate it.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyResult}
                  className="font-mono text-xs uppercase tracking-wider px-3 py-2 border border-rule rounded hover:border-ink transition-colors"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={shareTwitter}
                  className="font-mono text-xs uppercase tracking-wider px-3 py-2 border border-rule rounded hover:border-ink transition-colors"
                >
                  X / Twitter
                </button>
                <button
                  onClick={shareFacebook}
                  className="font-mono text-xs uppercase tracking-wider px-3 py-2 border border-rule rounded hover:border-ink transition-colors"
                >
                  Facebook
                </button>
              </div>
            </div>
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

function CouncilDisplay({ result }: { result: CouncilResult }) {
  return (
    <div className="space-y-8">
      {result.reflections.map((r, i) => (
        <article
          key={i}
          className={`bg-surface border border-rule rounded p-6 sm:p-8 animate-stagger-${i + 1}`}
        >
          <div className="mb-5 pb-4 border-b border-rule">
            <p className="font-mono text-[0.65rem] tracking-wider uppercase text-muted mb-1">
              Voice {i + 1} of 3
            </p>
            <p className="font-display text-2xl font-medium text-ink">{r.thinker}</p>
          </div>
          <div className="reflection-content text-base">
            <FormattedReflection text={r.reflection} />
          </div>
        </article>
      ))}

      {/* Synthesis */}
      <article className="bg-ink text-canvas rounded p-6 sm:p-8 synthesis-card">
        <p className="font-mono text-[0.65rem] tracking-wider uppercase text-canvas/60 mb-4">
          Synthesis
        </p>
        <div className="reflection-content">
          <FormattedReflection text={result.synthesis} />
        </div>
      </article>
    </div>
  );
}
