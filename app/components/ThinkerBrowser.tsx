"use client";

import { useState, useMemo } from "react";
import { THINKERS, getTraditions, type Thinker, type Tradition } from "@/app/lib/thinkers";
import { ThinkerCard } from "./ThinkerCard";

export function ThinkerBrowser({
  onSelect,
  onClose,
  selectedIds = [],
  maxSelection = 1,
}: {
  onSelect: (thinkerId: string) => void;
  onClose: () => void;
  selectedIds?: string[];
  maxSelection?: number;
}) {
  const [search, setSearch] = useState("");
  const [tradition, setTradition] = useState<Tradition | "all">("all");

  const traditions = getTraditions();
  const isMulti = maxSelection > 1;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return THINKERS.filter((t) => {
      if (tradition !== "all" && t.tradition !== tradition) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.framing.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.tradition.toLowerCase().includes(q)
      );
    });
  }, [search, tradition]);

  return (
    <div className="bg-canvas border border-rule rounded animate-fade-in">
      {/* Header */}
      <div className="border-b border-rule p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display text-sm tracking-[0.18em] uppercase text-secondary font-medium mb-1">
            {isMulti ? `Choose ${maxSelection} thinkers` : "Choose a thinker"}
          </p>
          <p className="text-sm text-muted">
            {isMulti && selectedIds.length > 0
              ? `${selectedIds.length} of ${maxSelection} selected · `
              : ""}
            {filtered.length} of {THINKERS.length} {filtered.length === 1 ? "voice" : "voices"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMulti && selectedIds.length === maxSelection && (
            <button
              onClick={onClose}
              className="text-sm bg-ink text-canvas px-4 py-1.5 rounded hover:bg-secondary transition-colors"
            >
              Done
            </button>
          )}
          <button
            onClick={onClose}
            className="text-base text-muted hover:text-ink transition-colors px-2 -mr-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-5 border-b border-rule space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, idea, or tradition..."
          className="w-full px-4 py-2.5 bg-surface border border-rule rounded text-base focus:outline-none focus:border-ink transition-colors"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTradition("all")}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              tradition === "all"
                ? "bg-ink text-canvas border-ink"
                : "bg-transparent text-secondary border-rule hover:border-ink"
            }`}
          >
            All
          </button>
          {traditions.map((trad) => (
            <button
              key={trad}
              onClick={() => setTradition(trad)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                tradition === trad
                  ? "bg-ink text-canvas border-ink"
                  : "bg-transparent text-secondary border-rule hover:border-ink"
              }`}
            >
              {trad}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of full baseball cards */}
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <p className="text-center text-muted italic py-8">
            No thinkers match your search.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              const isFull = isMulti && selectedIds.length >= maxSelection && !isSelected;
              return (
                <button
                  key={t.id}
                  onClick={() => !isFull && onSelect(t.id)}
                  disabled={isFull}
                  className={`text-left group relative ${isFull ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-10 bg-ink text-canvas font-mono text-xs px-2 py-1 rounded">
                      Selected
                    </div>
                  )}
                  <div className={isSelected ? "ring-2 ring-ink rounded-md" : ""}>
                    <ThinkerCard thinker={t} variant="browse" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
