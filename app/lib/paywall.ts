/**
 * Paywall state — localStorage-based for Path A (no backend).
 * 
 * Free tier limits:
 * - 3 open reflections per calendar month
 * - Single thinker only (council of 3 is paid)
 * - Daily prompts: unlimited
 * 
 * When Path B (Supabase) ships, this module gets replaced by
 * server-side checks. The interface stays the same.
 */

const STORAGE_KEY = "counsel-paywall-v1";

type PaywallState = {
  isPaid: boolean;
  openReflectionsThisMonth: number;
  openReflectionsMonth: string; // "YYYY-M" — resets when month changes
  paywallShownThisSession: boolean;
};

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function load(): PaywallState {
  if (typeof window === "undefined") {
    return {
      isPaid: false,
      openReflectionsThisMonth: 0,
      openReflectionsMonth: getMonthKey(),
      paywallShownThisSession: false,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PaywallState;
      // Reset counter if month changed
      if (parsed.openReflectionsMonth !== getMonthKey()) {
        parsed.openReflectionsThisMonth = 0;
        parsed.openReflectionsMonth = getMonthKey();
      }
      // Session flag never persists across page loads
      parsed.paywallShownThisSession = false;
      return parsed;
    }
  } catch {}
  return {
    isPaid: false,
    openReflectionsThisMonth: 0,
    openReflectionsMonth: getMonthKey(),
    paywallShownThisSession: false,
  };
}

function save(state: PaywallState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Public API

export const FREE_OPEN_REFLECTION_LIMIT = 3;

export function getPaywallState(): PaywallState {
  return load();
}

export function isPaidUser(): boolean {
  return load().isPaid;
}

export function getOpenReflectionCount(): number {
  return load().openReflectionsThisMonth;
}

export function hasOpenReflectionsRemaining(): boolean {
  const state = load();
  if (state.isPaid) return true;
  return state.openReflectionsThisMonth < FREE_OPEN_REFLECTION_LIMIT;
}

export function canUseCouncil(): boolean {
  return isPaidUser();
}

export function recordOpenReflection() {
  const state = load();
  state.openReflectionsThisMonth += 1;
  save(state);
}

export function activatePaidPlan() {
  const state = load();
  state.isPaid = true;
  save(state);
}

// For dev/testing only — reset to free tier
export function resetToFree() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
