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
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Lexend:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
