/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fafaf7",
        ink: "#1a1814",
        secondary: "#444441",
        muted: "#888780",
        rule: "#d3d1c7",
        surface: "#ffffff",
        accent: "#5b3a1c",
        // Tradition tag colors — desaturated
        "tag-ancient": "#7a5c3a",
        "tag-abrahamic": "#5c4a35",
        "tag-asian": "#4a6b5c",
        "tag-modern": "#3a5266",
        "tag-american": "#6b3a3a",
        "tag-science": "#3a4a52",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        serif: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "stagger-1": "slideUp 0.4s ease-out 0.1s forwards",
        "stagger-2": "slideUp 0.4s ease-out 0.2s forwards",
        "stagger-3": "slideUp 0.4s ease-out 0.3s forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
