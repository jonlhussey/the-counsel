/**
 * Google Analytics event helpers for The Counsel.
 * Wraps window.gtag with graceful no-op fallback if GA hasn't loaded.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

// Daily prompt events
export function trackDailyPromptViewed(promptId: number, category: string) {
  gtag("event", "daily_prompt_viewed", {
    prompt_id: promptId,
    category,
    date: new Date().toISOString().slice(0, 10),
  });
}

export function trackDailyPromptSelected(promptId: number, category: string) {
  gtag("event", "daily_prompt_selected", {
    prompt_id: promptId,
    category,
    date: new Date().toISOString().slice(0, 10),
  });
}

export function trackDailyPromptCompleted(
  promptId: number,
  category: string,
  thinkerId: string
) {
  gtag("event", "daily_prompt_completed", {
    prompt_id: promptId,
    category,
    thinker_id: thinkerId,
    date: new Date().toISOString().slice(0, 10),
  });
}

// Open reflection events
export function trackOpenReflectionStarted(source: "open" | "daily") {
  gtag("event", "open_reflection_started", { source });
}

export function trackOpenReflectionCompleted(
  thinkerId: string,
  mode: "single" | "council"
) {
  gtag("event", "open_reflection_completed", {
    thinker_id: thinkerId,
    mode,
  });
}

// Paywall events
export type PaywallTrigger =
  | "council_lock"
  | "open_limit"
  | "history_lock"
  | "manual";

export function trackPaywallTriggered(trigger: PaywallTrigger) {
  gtag("event", "paywall_triggered", { trigger_condition: trigger });
}

export function trackPaywallDismissed() {
  gtag("event", "paywall_dismissed");
}

export function trackPaywallConverted(plan: "monthly" | "annual") {
  gtag("event", "paywall_converted", { plan });
}

// Other engagement events
export function trackHistoryOpened() {
  gtag("event", "history_tab_opened");
}
