"use client";

import React from "react";

export function FormattedReflection({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        // Blockquote
        if (block.startsWith(">")) {
          const content = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join(" ");
          return <blockquote key={i}>{content}</blockquote>;
        }

        // Section label
        const sectionMatch = block.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
        if (sectionMatch) {
          const [, label, rest] = sectionMatch;
          const restTrimmed = rest.trim();
          const hasInferenceMarker = /^\[INFERENCE\]/i.test(restTrimmed);
          const cleanRest = restTrimmed.replace(/^\[INFERENCE\]\s*/i, "");
          return (
            <div key={i}>
              <strong>{label}</strong>
              {cleanRest && (
                <p>
                  {hasInferenceMarker && (
                    <span className="inference-marker">Inference</span>
                  )}
                  {renderInline(cleanRest)}
                </p>
              )}
            </div>
          );
        }

        // Confidence line
        if (/^(High|Medium|Low)\b/i.test(block)) {
          const level = block.match(/^(High|Medium|Low)/i)?.[1].toLowerCase();
          const word = block.split(/\s/)[0];
          return (
            <p key={i}>
              <span className={`confidence-pill confidence-${level}`}>{word}</span>
              {renderInline(block.replace(/^\S+\s*/, ""))}
            </p>
          );
        }

        return <p key={i}>{renderInline(block)}</p>;
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
