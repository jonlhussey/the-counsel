// app/api/og/route.tsx
// Generates a 1080x1080 PNG of the shareable card.
// Uses @vercel/og which renders JSX to PNG via Satori.

import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Loads a Google Font as a TTF buffer for use with Satori.
 * IE-User-Agent trick: Google Fonts CSS API serves TTF URLs (instead of the
 * WOFF2 it serves to modern browsers) when fed an old User-Agent. Satori
 * requires TTF/OTF, so this is necessary.
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  italic: boolean = false
): Promise<ArrayBuffer> {
  const params = new URLSearchParams();
  if (italic) {
    params.set("family", `${family}:ital,wght@1,${weight}`);
  } else {
    params.set("family", `${family}:wght@${weight}`);
  }
  const url = `https://fonts.googleapis.com/css2?${params.toString()}`;

  const css = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
    },
  }).then((r) => r.text());

  // Match any URL on fonts.gstatic.com — Google uses two URL formats
  // (direct .ttf and /l/font?kit=...), both serve TTF data.
  const match = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!match) {
    throw new Error(
      `No font URL found for ${family} ${weight}${italic ? " italic" : ""}. CSS body: ${css.slice(0, 200)}`
    );
  }

  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(
      `Font fetch ${fontRes.status} for ${family} ${weight}${italic ? " italic" : ""}`
    );
  }
  return fontRes.arrayBuffer();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const synopsis = searchParams.get("synopsis") || "";
    const voicesParam = searchParams.get("voices") || "";
    const voices = voicesParam.split("|").filter(Boolean);
    const synthesis = searchParams.get("synthesis") || "";
    const quotesParam = searchParams.get("quotes") || "";
    const quotes = quotesParam
      .split("|||")
      .filter(Boolean)
      .map((q) => {
        const [text, attribution] = q.split("~~");
        return { text: text || "", attribution: attribution || "" };
      });

    const [fraunces400, frauncesItalic, lexend400, lexend500] = await Promise.all([
      loadGoogleFont("Fraunces", 400, false),
      loadGoogleFont("Fraunces", 400, true),
      loadGoogleFont("Lexend", 400, false),
      loadGoogleFont("Lexend", 500, false),
    ]);

    const isCouncil = voices.length > 1;
    const quotesToShow = quotes.slice(0, isCouncil ? 2 : 1);

    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1080,
            background: "#fafaf7",
            padding: "70px 80px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "Lexend",
            color: "#1a1814",
          }}
        >
          {/* Top section: header + content */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 52,
              }}
            >
              <svg width="46" height="58" viewBox="0 0 80 100">
                <line x1="14" y1="20" x2="14" y2="80" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
                <line x1="40" y1="14" x2="40" y2="86" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
                <line x1="66" y1="20" x2="66" y2="80" stroke="#1a1814" strokeWidth="9" strokeLinecap="round" />
              </svg>
              <span
                style={{
                  fontFamily: "Fraunces",
                  fontSize: 40,
                  color: "#1a1814",
                  lineHeight: 1,
                }}
              >
                The Counsel
              </span>
            </div>

            {/* Synopsis */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 36 }}>
              <span
                style={{
                  fontFamily: "Lexend",
                  fontSize: 15,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#888780",
                  fontWeight: 500,
                  marginBottom: 14,
                }}
              >
                Scenario
              </span>
              <span
                style={{
                  fontFamily: "Fraunces",
                  fontSize: 36,
                  lineHeight: 1.25,
                  color: "#1a1814",
                  fontWeight: 400,
                }}
              >
                {synopsis}
              </span>
            </div>

            {/* Voices */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 36 }}>
              <span
                style={{
                  fontFamily: "Lexend",
                  fontSize: 15,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#888780",
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                {isCouncil ? "A council of three" : "Reflection from"}
              </span>
              <span
                style={{
                  fontFamily: "Fraunces",
                  fontStyle: "italic",
                  fontSize: 30,
                  lineHeight: 1.3,
                  color: "#444441",
                }}
              >
                {voices.join("  ·  ")}
              </span>
            </div>

            {/* Pull quotes */}
            {quotesToShow.map((q, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: "3px solid #1a1814",
                  paddingLeft: 24,
                  marginBottom: 28,
                }}
              >
                <span
                  style={{
                    fontFamily: "Fraunces",
                    fontStyle: "italic",
                    fontSize: 32,
                    lineHeight: 1.32,
                    color: "#1a1814",
                    marginBottom: 12,
                  }}
                >
                  &ldquo;{q.text}&rdquo;
                </span>
                <span
                  style={{
                    fontFamily: "Lexend",
                    fontSize: 17,
                    color: "#888780",
                    fontWeight: 500,
                  }}
                >
                  — {q.attribution}
                </span>
              </div>
            ))}

            {/* Synthesis */}
            {synthesis && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                <span
                  style={{
                    fontFamily: "Lexend",
                    fontSize: 15,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: "#888780",
                    fontWeight: 500,
                    marginBottom: 14,
                  }}
                >
                  Synthesis
                </span>
                <span
                  style={{
                    fontFamily: "Fraunces",
                    fontSize: 22,
                    lineHeight: 1.5,
                    color: "#1a1814",
                    fontWeight: 400,
                  }}
                >
                  {synthesis}
                </span>
              </div>
            )}
          </div>

          {/* Footer (always at bottom thanks to space-between on parent) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 24,
              borderTop: "1px solid #d3d1c7",
              fontSize: 16,
              color: "#888780",
            }}
          >
            <span style={{ fontFamily: "Lexend", letterSpacing: 1.5 }}>
              www.thecounsel.app
            </span>
            <span
              style={{
                fontFamily: "Lexend",
                fontSize: 13,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Reflections from history
            </span>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts: [
          { name: "Fraunces", data: fraunces400, weight: 400, style: "normal" },
          { name: "Fraunces", data: frauncesItalic, weight: 400, style: "italic" },
          { name: "Lexend", data: lexend400, weight: 400, style: "normal" },
          { name: "Lexend", data: lexend500, weight: 500, style: "normal" },
        ],
      }
    );
  } catch (err) {
    console.error("OG generation error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Failed to generate image: ${msg}`, { status: 500 });
  }
}
