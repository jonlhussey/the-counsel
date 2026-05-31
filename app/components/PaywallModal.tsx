"use client";

import { useState } from "react";
import {
  trackPaywallDismissed,
  trackPaywallConverted,
  type PaywallTrigger,
} from "@/app/lib/analytics";
import { activatePaidPlan, FREE_OPEN_REFLECTION_LIMIT } from "@/app/lib/paywall";

type Plan = "annual" | "monthly";

type Props = {
  trigger: PaywallTrigger;
  onDismiss: () => void;
  onUnlock: () => void;
};

const TRIGGER_MESSAGES: Record<PaywallTrigger, string> = {
  council_lock: "The Council of three is a paid feature.",
  open_limit: `You've used your ${FREE_OPEN_REFLECTION_LIMIT} free reflections this month.`,
  history_lock: "Your full reflection history is a paid feature.",
  manual: "Unlock everything The Counsel has to offer.",
};

export function PaywallModal({ trigger, onDismiss, onUnlock }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);

  function handleDismiss() {
    trackPaywallDismissed();
    onDismiss();
  }

  async function handleUnlock() {
    setLoading(true);
    // Path A: simulate activation (no Stripe yet)
    // When Stripe is integrated, replace this with a checkout redirect
    await new Promise((r) => setTimeout(r, 600));
    trackPaywallConverted(selectedPlan);
    activatePaidPlan();
    setLoading(false);
    onUnlock();
  }

  return (
    <div className="paywall-overlay" onClick={handleDismiss}>
      <div
        className="paywall-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Unlock The Counsel"
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="paywall-close"
          aria-label="Dismiss"
        >
          ✕
        </button>

        {/* Header */}
        <div className="paywall-header">
          <div className="paywall-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M7 14V10a9 9 0 0 1 18 0v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="4"
                y="14"
                width="24"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="16" cy="22" r="2" fill="currentColor" />
            </svg>
          </div>
          <h2 className="paywall-title">Unlock The Counsel</h2>
          <p className="paywall-subtitle">{TRIGGER_MESSAGES[trigger]}</p>
        </div>

        {/* Feature list */}
        <ul className="paywall-features">
          {[
            "Council of three thinkers",
            "Unlimited open reflections",
            "Full reflection history, forever",
            "Re-reflect on past entries",
            "Export your reflections",
          ].map((f) => (
            <li key={f} className="paywall-feature-item">
              <span className="paywall-check" aria-hidden="true">✓</span>
              {f}
            </li>
          ))}
        </ul>

        {/* Plan selection */}
        <div className="paywall-plans">
          <button
            onClick={() => setSelectedPlan("annual")}
            className={`paywall-plan ${selectedPlan === "annual" ? "selected" : ""}`}
          >
            <div className="paywall-plan-top">
              <span className="paywall-plan-name">Annual</span>
              <span className="paywall-plan-badge">Best value</span>
            </div>
            <div className="paywall-plan-price">
              $40 <span className="paywall-plan-period">/ year</span>
            </div>
            <div className="paywall-plan-note">Save $20 vs monthly</div>
          </button>

          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`paywall-plan ${selectedPlan === "monthly" ? "selected" : ""}`}
          >
            <div className="paywall-plan-top">
              <span className="paywall-plan-name">Monthly</span>
            </div>
            <div className="paywall-plan-price">
              $5 <span className="paywall-plan-period">/ month</span>
            </div>
            <div className="paywall-plan-note">&nbsp;</div>
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleUnlock}
          disabled={loading}
          className="paywall-cta"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              Unlocking
              <span className="dot-1">.</span>
              <span className="dot-2">.</span>
              <span className="dot-3">.</span>
            </span>
          ) : (
            <>
              Unlock —{" "}
              {selectedPlan === "annual" ? "$40 / year" : "$5 / month"}
            </>
          )}
        </button>

        <p className="paywall-notice">
          Payment processing coming soon. Clicking unlock activates a free
          preview of the paid tier.
        </p>

        {/* Footer links */}
        <div className="paywall-footer-links">
          <button className="paywall-footer-link">Restore purchase</button>
          <span className="text-muted">·</span>
          <button className="paywall-footer-link">Terms</button>
          <span className="text-muted">·</span>
          <button className="paywall-footer-link">Privacy</button>
        </div>
      </div>
    </div>
  );
}
