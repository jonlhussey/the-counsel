import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Counsel — Reflections from history's thinkers",
  description:
    "Describe a scenario. Receive reflections from history's great thinkers, grounded in their own writings.",
  openGraph: {
    title: "The Counsel — Reflections from history's thinkers",
    description:
      "Describe a scenario. Receive reflections from history's great thinkers, grounded in their own writings.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 100'%3E%3Cline x1='14' y1='20' x2='14' y2='80' stroke='%231a1814' stroke-width='10' stroke-linecap='round'/%3E%3Cline x1='40' y1='14' x2='40' y2='86' stroke='%231a1814' stroke-width='10' stroke-linecap='round'/%3E%3Cline x1='66' y1='20' x2='66' y2='80' stroke='%231a1814' stroke-width='10' stroke-linecap='round'/%3E%3C/svg%3E"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Lexend:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
