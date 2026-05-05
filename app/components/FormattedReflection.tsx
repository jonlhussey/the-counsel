"use client";

import React from "react";

/**
 * Renders a structured reflection from the model. Handles:
 * - **Section labels** at the start of a block become bold headers
 * - > blockquotes (for direct quotes from primary corpus)
 * - **bold** and *italic* inline
 * - [INFERENCE] markers become red badges
 * - High/Medium/Low confidence becomes a styled pill
 * - Strips stray markdown like ##, ---, raw bullets the model occasionally adds
 */
export function FormattedReflection({ text }: { text: string }) {
  // Pre-clean: strip markdown elements that don't belong
  const cleaned = preCleanText(text);
  const blocks = cleaned.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        // Blockquote (handles single or multi-line)
        if (block.startsWith(">")) {
          const content = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .filter(Boolean)
            .join(" ")
            .trim();
          if (!content) return null;
          return <blockquote key={i}>{renderInline(content)}</blockquote>;
        }

        // Section label (block starts with **Label**)
        const sectionMatch = block.match(/^\*\*([^*]+)\*\*\s*:?\s*\n?([\s\S]*)$/);
        if (sectionMatch) {
          const [, label, rest] = sectionMatch;
          const restTrimmed = rest.trim();
          const hasInferenceMarker = /^\[INFERENCE\]/i.test(restTrimmed);
          const cleanRest = restTrimmed.replace(/^\[INFERENCE\]\s*/i, "");
          return (
            <div key={i}>
              <strong>{label.trim()}</strong>
              {cleanRest && renderBodyAfterLabel(cleanRest, hasInferenceMarker)}
            </div>
          );
        }

        // Confidence line (e.g. "High — close parallel...")
        if (/^(High|Medium|Low)\b/i.test(block)) {
          const level = block.match(/^(High|Medium|Low)/i)?.[1].toLowerCase();
          const word = block.match(/^(High|Medium|Low)/i)?.[1];
          const rest = block.replace(/^(High|Medium|Low)\s*[—–-]?\s*/i, "");
          return (
            <p key={i}>
              <span className={`confidence-pill confidence-${level}`}>{word}</span>
              {renderInline(rest)}
            </p>
          );
        }

        return <p key={i}>{renderInline(block)}</p>;
      })}
    </>
  );
}

/**
 * Strips markdown the model occasionally emits that we don't want to render literally.
 * - `## Heading` lines → strip the marker, keep text
 * - `---` horizontal rules → removed
 * - Lines starting with `*` or `-` bullets get the marker stripped
 */
function preCleanText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (/^#{1,6}\s/.test(line)) {
        return line.replace(/^#{1,6}\s+/, "");
      }
      if (/^[-*_]{3,}\s*$/.test(line)) {
        return "";
      }
      return line.replace(/^[\s]*[-*•]\s+/, "");
    })
    .join("\n");
}

/**
 * After a **Section Label**, render the body. The body might contain
 * blockquotes interleaved with prose.
 */
function renderBodyAfterLabel(body: string, withInference: boolean) {
  const lines = body.split("\n");
  const blocks: { type: "quote" | "text"; content: string }[] = [];
  let currentText: string[] = [];
  let currentQuote: string[] = [];

  const flushText = () => {
    const t = currentText.join(" ").trim();
    if (t) blocks.push({ type: "text", content: t });
    currentText = [];
  };
  const flushQuote = () => {
    const q = currentQuote.join(" ").trim();
    if (q) blocks.push({ type: "quote", content: q });
    currentQuote = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith(">")) {
      flushText();
      currentQuote.push(line.replace(/^\s*>\s?/, ""));
    } else if (line.trim() === "") {
      flushText();
      flushQuote();
    } else {
      flushQuote();
      currentText.push(line);
    }
  }
  flushText();
  flushQuote();

  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "quote") {
          return <blockquote key={i}>{renderInline(b.content)}</blockquote>;
        }
        const isFirst = i === 0;
        return (
          <p key={i}>
            {isFirst && withInference && (
              <span className="inference-marker">Inference</span>
            )}
            {renderInline(b.content)}
          </p>
        );
      })}
    </>
  );
}

/**
 * Render inline content. Handles **bold** and *italic*.
 * Strips any orphaned ** or * markers that don't have a matching close.
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  const pattern = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      !part.startsWith("**") &&
      part.length > 2
    ) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    // Strip leftover orphan markdown markers
    const cleaned = part
      .replace(/\*+/g, "")  // stray asterisks
      .replace(/`+/g, "")   // stray backticks
      .replace(/\s>\s/g, " ")  // mid-sentence quote markers like "demands: > "
      .replace(/^>\s/, "")  // leading > if it slipped through
      .replace(/\s>$/, ""); // trailing >
    return <span key={i}>{cleaned}</span>;
  });
}
