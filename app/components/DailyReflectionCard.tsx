"use client";

import { useState, useEffect } from "react";
import { getDailyPrompts, type DailyPrompt } from "@/app/lib/dailyPrompts";
import { trackDailyPromptViewed, trackDailyPromptSelected } from "@/app/lib/analytics";

type Props = {
  onSelect: (prompt: DailyPrompt) => void;
  selectedPromptId: number | null;
};

export function DailyReflectionCard({ onSelect, selectedPromptId }: Props) {
  const [prompts, setPrompts] = useState<DailyPrompt[]>([]);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    const daily = getDailyPrompts();
    setPrompts(daily);
    if (!tracked) {
      daily.forEach((p) => trackDailyPromptViewed(p.id, p.category));
      setTracked(true);
    }
  }, [tracked]);

  // Today's date formatted nicely
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (prompts.length === 0) return null;

  function handleSelect(prompt: DailyPrompt) {
    trackDailyPromptSelected(prompt.id, prompt.category);
    onSelect(prompt);
  }

  return (
    <div className="daily-reflection-card">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium">
            Today&apos;s reflections
          </p>
          <p className="text-xs text-muted mt-0.5">{today}</p>
        </div>
        <span className="daily-badge">5 new today</span>
      </div>

      <p className="text-xs text-muted mb-3 leading-relaxed">
        Choose one to begin — or scroll down to bring your own question.
      </p>

      {/* Prompt pills */}
      <ul className="space-y-2">
        {prompts.map((prompt) => {
          const isSelected = selectedPromptId === prompt.id;
          return (
            <li key={prompt.id}>
              <button
                onClick={() => handleSelect(prompt)}
                className={`daily-prompt-pill ${isSelected ? "selected" : ""}`}
              >
                <span className="daily-prompt-category">{prompt.category}</span>
                <span className="daily-prompt-text">{prompt.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
