"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { ThinkerBrowser } from "./components/ThinkerBrowser";
import { ThinkerCard } from "./components/ThinkerCard";
import { FormattedReflection } from "./components/FormattedReflection";
import { ShareableCard } from "./components/ShareableCard";
import { Logo } from "./components/Logo";
import { DailyReflectionCard } from "./components/DailyReflectionCard";
import { PaywallModal } from "./components/PaywallModal";
import { getThinker } from "@/app/lib/thinkers";
import type { CardData } from "@/app/lib/parseCard";
import type { DailyPrompt } from "@/app/lib/dailyPrompts";
import {
  hasOpenReflectionsRemaining,
  canUseCouncil,
  recordOpenReflection,
  getOpenReflectionCount,
  isPaidUser,
  FREE_OPEN_REFLECTION_LIMIT,
} from "@/app/lib/paywall";
import {
  trackOpenReflectionStarted,
  trackOpenReflectionCompleted,
  trackPaywallTriggered,
  trackHistoryOpened,
  trackDailyPromptCompleted,
  type PaywallTrigger,
} from "@/app/lib/analytics";

// 25 placeholder prompts — one shown randomly each page load
const PLACEHOLDER_PROMPTS = [
  "How do I figure out what I actually want to do with my life?",
  "I want to ask for a raise next week. How should I approach my manager?",
  "Why do I keep setting goals I never follow through on?",
  "My mom gets upset when I don't pick up her daily calls. How do I set a boundary without hurting her?",
  "How do I stop overthinking everything?",
  "I really hurt my partner and need to apologize. Help me figure out what to say.",
  "What does it actually mean to set healthy boundaries?",
  "I have a job interview tomorrow and I'm spiraling. Help me calm down.",
  "How do I know if my childhood is affecting my relationships now?",
  "I think I need to break up with my partner. How do I do this kindly?",
  "How do I stop being so hard on myself?",
  "My friend just told me her mom has cancer. What do I even say to her?",
  "People keep telling me to \"do the inner work.\" What does that even mean?",
  "I'm burned out but scared to tell my boss. What do I say?",
  "I second-guess every decision I make. How do I learn to trust myself?",
  "My roommate leaves dishes for days. How do I bring this up without a fight?",
  "I make good money but feel broke. What's wrong with my relationship with money?",
  "I just got rejected from my dream job. How do I move past this?",
  "How do I build a habit that actually sticks this time?",
  "My best friend never reaches out anymore. Should I say something?",
  "What are the signs of a relationship I should leave?",
  "How do I get better at listening without jumping in to talk?",
  "I failed at something big and can't shake it. How do I move on?",
  "How do I actually be more present instead of always in my head?",
  "How do I stop saying yes when I really mean no?",
];

function getRandomPlaceholder(): string {
  return PLACEHOLDER_PROMPTS[Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length)];
}

type Mode = "single" | "council";
type Picker = "user" | "auto";

type SingleResult = {
  mode: "single";
  thinkerId: string;
  thinkerName: string;
  scenario: string;
  reflection: string;
  card: CardData;
  source?: "daily" | "open";
  dailyPromptId?: number;
  dailyPromptCategory?: string;
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

const STORAGE_KEY = "counsel-history-v2";
const MAX_HISTORY = 50;

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("single");
  const [picker, setPicker] = useState<Picker>("user");
  const [scenario, setScenario] = useState("");
  const [placeholder] = useState(getRandomPlaceholder);
  const [thinkerId, setThinkerId] = useState<string | null>(null);
  const [councilThinkerIds, setCouncilThinkerIds] = useState<string[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserMode, setBrowserMode] = useState<"single" | "council">("single");

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Daily prompts
  const [selectedDailyPrompt, setSelectedDailyPrompt] = useState<DailyPrompt | null>(null);

  // Paywall
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(null);
  const [paywallShownThisSession, setPaywallShownThisSession] = useState(false);
  const [paidUser, setPaidUser] = useState(false);
  const [openReflectionCount, setOpenReflectionCount] = useState(0);

  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
    setPaidUser(isPaidUser());
    setOpenReflectionCount(getOpenReflectionCount());
  }, []);

  function refreshPaywallState() {
    setPaidUser(isPaidUser());
    setOpenReflectionCount(getOpenReflectionCount());
  }

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
    if (item.mode === "single") setThinkerId(item.thinkerId);
    else setCouncilThinkerIds(item.thinkerIds);
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
    setSelectedDailyPrompt(null);
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
      setCouncilThinkerIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 3) return prev;
        const next = [...prev, id];
        if (next.length === 3) setShowBrowser(false);
        return next;
      });
    }
  }

  // Daily prompt selected — populate textarea and scroll to it
  function handleDailyPromptSelect(prompt: DailyPrompt) {
    setSelectedDailyPrompt(prompt);
    setScenario(prompt.text);
    setTimeout(() => {
      const ta = document.getElementById("scenario") as HTMLTextAreaElement | null;
      if (ta) {
        ta.scrollIntoView({ behavior: "smooth", block: "center" });
        ta.focus();
      }
    }, 150);
  }

  // Paywall helpers
  function showPaywall(trigger: PaywallTrigger) {
    if (paywallShownThisSession) return;
    trackPaywallTriggered(trigger);
    setPaywallTrigger(trigger);
  }

  function handlePaywallDismiss() {
    setPaywallTrigger(null);
    setPaywallShownThisSession(true);
  }

  function handlePaywallUnlock() {
    setPaywallTrigger(null);
    refreshPaywallState();
  }

  // Council mode switch — check paywall
  function handleSetCouncil() {
    if (!isPaidUser() && !paywallShownThisSession) {
      showPaywall("council_lock");
      return;
    }
    setMode("council");
    setResult(null);
  }

  function canSubmit(): boolean {
    if (!scenario.trim() || loading) return false;
    if (mode === "single" && picker === "user" && !thinkerId) return false;
    if (mode === "council" && picker === "user" && councilThinkerIds.length !== 3) return false;
    return true;
  }

  // Remaining open reflections display
  const reflectionsRemaining = FREE_OPEN_REFLECTION_LIMIT - openReflectionCount;
  const showCounter = !paidUser && reflectionsRemaining <= FREE_OPEN_REFLECTION_LIMIT;
  const isFromDailyPrompt = selectedDailyPrompt !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit()) return;

    // Check paywall for open reflections (daily prompts don't count)
    if (!isFromDailyPrompt && !paidUser) {
      if (!hasOpenReflectionsRemaining()) {
        showPaywall("open_limit");
        return;
      }
    }

    trackOpenReflectionStarted(isFromDailyPrompt ? "daily" : "open");
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "single") {
        let useThinkerId = thinkerId;
        if (picker === "auto") {
          const pickRes = await fetch("/api/pick-thinker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scenario.trim(), count: 1 }),
          });
          const pickData = await pickRes.json();
          if (!pickRes.ok) { setError(pickData.error || "Could not pick a thinker."); return; }
          useThinkerId = pickData.thinkerIds[0];
        }

        const res = await fetch("/api/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: scenario.trim(), thinkerId: useThinkerId }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Something went wrong."); return; }

        // Track completion
        trackOpenReflectionCompleted(useThinkerId!, "single");
        if (isFromDailyPrompt && selectedDailyPrompt) {
          trackDailyPromptCompleted(
            selectedDailyPrompt.id,
            selectedDailyPrompt.category,
            useThinkerId!
          );
        }

        const r: SingleResult = {
          mode: "single",
          thinkerId: useThinkerId!,
          thinkerName: data.thinker,
          scenario: scenario.trim(),
          reflection: data.reflection,
          card: data.card,
          source: isFromDailyPrompt ? "daily" : "open",
          dailyPromptId: selectedDailyPrompt?.id,
          dailyPromptCategory: selectedDailyPrompt?.category,
        };
        setResult(r);
        saveToHistory(r);

        // Record against free tier only for open (non-daily) reflections
        if (!isFromDailyPrompt) {
          recordOpenReflection();
          refreshPaywallState();
        }
      } else {
        // Council mode — already gated at mode selection
        const body: { scenario: string; thinkerIds?: string[] } = {
          scenario: scenario.trim(),
        };
        if (picker === "user") body.thinkerIds = councilThinkerIds;

        const res = await fetch("/api/council", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Something went wrong."); return; }

        const ids: string[] = data.thinkerIds;
        ids.forEach((id) => trackOpenReflectionCompleted(id, "council"));

        const r: CouncilResult = {
          mode: "council",
          thinkerIds: data.thinkerIds,
          reflections: data.reflections,
          scenario: scenario.trim(),
          card: data.card,
        };
        setResult(r);
        saveToHistory(r);
        recordOpenReflection();
        refreshPaywallState();
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
    <>
      {/* Paywall modal */}
      {paywallTrigger && (
        <PaywallModal
          trigger={paywallTrigger}
          onDismiss={handlePaywallDismiss}
          onUnlock={handlePaywallUnlock}
        />
      )}

      <main className="relative min-h-screen px-5 sm:px-8 py-12 sm:py-16 max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-10 sm:mb-12 animate-fade-in">
          <div className="mb-8">
            <Logo onClick={startNew} />
          </div>
          <h1 className="font-display font-normal text-ink leading-[0.95] tracking-tight text-5xl sm:text-7xl md:text-[5.5rem] mb-5">
            What would
            <br />
            <span className="italic text-secondary">they</span> do?
          </h1>
          <p className="text-secondary text-base sm:text-lg leading-relaxed max-w-xl">
            Bring a question to one of history&apos;s great thinkers — or summon
            a council of three to weigh in from different traditions.
          </p>
        </header>

        {/* ── DAILY REFLECTION ── */}
        <section className="mb-10 animate-slide-up">
          <DailyReflectionCard
            onSelect={handleDailyPromptSelect}
            selectedPromptId={selectedDailyPrompt?.id ?? null}
          />
        </section>

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-rule" />
          <span className="font-display text-xs tracking-[0.2em] uppercase text-muted whitespace-nowrap">
            or bring your own question
          </span>
          <div className="flex-1 h-px bg-rule" />
        </div>

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
              onClick={handleSetCouncil}
              className={`${mode === "council" ? "active" : ""} ${!paidUser ? "council-locked" : ""}`}
            >
              Council of three
              {!paidUser && <span className="lock-badge" aria-label="paid feature">🔒</span>}
            </button>
          </div>
          {!paidUser && (
            <p className="mt-2 text-xs text-muted">
              Council of three is a paid feature.{" "}
              <button
                className="underline underline-offset-2 hover:text-ink"
                onClick={() => showPaywall("council_lock")}
              >
                Unlock →
              </button>
            </p>
          )}
        </section>

        {/* Picker toggle */}
        <section className="mb-8 animate-slide-up">
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-4">
            {mode === "single" ? "Who will reflect?" : "Who will be on the council?"}
          </p>
          <div className="mode-toggle">
            <button onClick={() => setPicker("user")} className={picker === "user" ? "active" : ""}>
              I&apos;ll choose
            </button>
            <button onClick={() => setPicker("auto")} className={picker === "auto" ? "active" : ""}>
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

        {/* Thinker selection */}
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
                <p className="font-display text-lg text-ink mb-1">Browse 85 thinkers →</p>
                <p className="text-sm text-muted">Searchable, filterable by tradition.</p>
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
                        onClick={() => setCouncilThinkerIds((prev) => prev.filter((x) => x !== id))}
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
                <p className="font-display text-lg text-ink mb-1">Pick three thinkers →</p>
                <p className="text-sm text-muted">Selected thinkers will appear here.</p>
              </button>
            )}
          </section>
        )}

        {/* Scenario input */}
        <section className="mb-8">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium">
                Your scenario
              </p>
              {/* Usage counter */}
              {showCounter && !isFromDailyPrompt && (
                <span className={`text-xs font-mono ${reflectionsRemaining <= 1 ? "text-red-600" : "text-muted"}`}>
                  {reflectionsRemaining} open reflection{reflectionsRemaining !== 1 ? "s" : ""} remaining this month
                </span>
              )}
            </div>

            {/* Daily prompt indicator */}
            {selectedDailyPrompt && (
              <div className="daily-prompt-indicator">
                <span className="text-xs text-muted">From today&apos;s reflections · {selectedDailyPrompt.category}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedDailyPrompt(null); setScenario(""); }}
                  className="text-xs text-muted hover:text-ink ml-auto"
                >
                  Clear ✕
                </button>
              </div>
            )}

            <div className="bg-surface border border-rule rounded overflow-hidden">
              <div className="px-4 py-2 border-b border-rule flex justify-between items-center bg-canvas">
                <span className="font-mono text-[0.65rem] tracking-wider uppercase text-muted">
                  Describe the situation
                </span>
                <span className="font-mono text-xs text-muted">{scenario.length} / 2000</span>
              </div>
              <textarea
                id="scenario"
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  // If user edits a daily prompt, detach it so it counts as open
                  if (selectedDailyPrompt && e.target.value !== selectedDailyPrompt.text) {
                    setSelectedDailyPrompt(null);
                  }
                }}
                placeholder={placeholder}
                rows={5}
                maxLength={2000}
                disabled={loading}
                className="w-full px-4 py-4 bg-surface text-ink placeholder:text-muted/70 focus:outline-none resize-none font-sans text-lg leading-relaxed"
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) trackHistoryOpened();
                }}
                className="text-sm text-secondary hover:text-ink underline-offset-4 hover:underline"
              >
                {showHistory ? "Hide" : "View"} past reflections
                {history.length > 0 && (
                  <span className="ml-1 text-xs text-muted">({history.length})</span>
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
                  <button onClick={clearHistory} className="text-xs text-muted hover:text-red-700">
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-muted italic">No reflections yet. Your saved scenarios will appear here.</p>
              ) : (
                <ul className="space-y-1 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-start gap-3 py-2 hover:bg-surface rounded px-2 -mx-2 transition-colors"
                    >
                      <button onClick={() => loadFromHistory(item)} className="flex-1 text-left">
                        <p className="font-mono text-[0.65rem] tracking-wider uppercase text-muted mb-0.5">
                          {item.mode === "single"
                            ? item.thinkerName
                            : `Council · ${item.reflections.map((r) => r.thinker).join(", ")}`}
                        </p>
                        <p className="text-sm text-ink line-clamp-2 leading-snug">{item.scenario}</p>
                        <p className="text-xs text-muted mt-1">
                          {new Date(item.timestamp).toLocaleString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "numeric", minute: "2-digit",
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

            <ShareableCard card={result.card} reflectionPayload={result} />

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
    </>
  );
}

function SingleResultDisplay({ result }: { result: SingleResult }) {
  const thinker = getThinker(result.thinkerId);
  return (
    <div>
      {thinker && <div className="mb-8"><ThinkerCard thinker={thinker} variant="result" /></div>}
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
            {thinker && <div className="mb-6"><ThinkerCard thinker={thinker} variant="result" /></div>}
            <div className="reflection-content pl-1">
              <FormattedReflection text={r.reflection} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
