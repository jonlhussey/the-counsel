"use client";

import { useState, useMemo } from "react";
import { THINKERS, getTraditions, type Thinker, type Tradition } from "@/app/lib/thinkers";

type ViewMode = "list" | "grid";

export function ThinkerBrowser({
  onSelect,
  onClose,
}: {
  onSelect: (thinkerId: string) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [tradition, setTradition] = useState<Tradition | "all">("all");

  const traditions = getTraditions();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return THINKERS.filter((t) => {
      if (tradition !== "all" && t.tradition !== tradition) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.framing.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.tradition.toLowerCase().includes(q)
      );
    });
  }, [search, tradition]);

  const grouped = useMemo(() => {
    const map: Record<string, Thinker[]> = {};
    for (const t of filtered) {
      if (!map[t.tradition]) map[t.tradition] = [];
      map[t.tradition].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="bg-canvas border border-rule rounded animate-fade-in">
      <div className="border-b border-rule p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs tracking-wider uppercase text-muted mb-1">
            Choose a thinker
          </p>
          <p className="text-sm text-secondary">
            {filtered.length} of {THINKERS.length} thinkers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mode-toggle text-xs">
            <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
              List
            </button>
            <button onClick={() => setView("grid")} className={view === "grid" ? "active" : ""}>
              Grid
            </button>
          </div>
          <button onClick={onClose} className="text-sm text-muted hover:text-ink transition-colors px-2" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 border-b border-rule space-y-3">
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
            className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${
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
              className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${
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

      <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5">
        {filtered.length === 0 ? (
          <p className="text-center text-muted italic py-8">No thinkers match your search.</p>
        ) : view === "list" ? (
          <ListView grouped={grouped} onSelect={onSelect} />
        ) : (
          <GridView thinkers={filtered} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}

function ListView({
  grouped,
  onSelect,
}: {
  grouped: Record<string, Thinker[]>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([tradition, thinkers]) => (
        <div key={tradition}>
          <p className="font-mono text-xs tracking-wider uppercase text-muted mb-2 sticky top-0 bg-canvas py-1">
            {tradition} <span className="text-rule">·</span> {thinkers.length}
          </p>
          <ul>
            {thinkers.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t.id)}
                  className="group w-full text-left py-2.5 px-2 -mx-2 hover:bg-surface rounded transition-colors flex items-baseline gap-3"
                >
                  <span className="font-display text-base font-medium text-ink group-hover:underline underline-offset-4">
                    {t.name}
                  </span>
                  <span className="font-mono text-xs text-muted">{t.era}</span>
                  <span className="text-sm text-secondary truncate hidden sm:block">{t.framing}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function GridView({
  thinkers,
  onSelect,
}: {
  thinkers: Thinker[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {thinkers.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="thinker-card text-left bg-surface border border-rule rounded p-4 hover:shadow-sm"
        >
          <p className="font-mono text-[0.65rem] tracking-wider uppercase text-muted mb-1.5">
            {t.tradition}
          </p>
          <p className="font-display text-lg font-medium leading-tight mb-1 text-ink">{t.name}</p>
          <p className="font-mono text-xs text-muted mb-2">{t.era}</p>
          <p className="text-sm text-secondary leading-snug">{t.framing}</p>
        </button>
      ))}
    </div>
  );
}