import type { Config } from "tailwindcss";

/**
 * "Tactile Industrial Editorial" design tokens.
 * Colours are CSS variables (see app/globals.css) so dark mode just swaps the variables.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        "paper-2": "rgb(var(--paper-2) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        graphite: "rgb(var(--graphite) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        signal: "rgb(var(--signal) / <alpha-value>)",
        "signal-ink": "rgb(var(--signal-ink) / <alpha-value>)",
        moss: "rgb(var(--moss) / <alpha-value>)",
        steel: "rgb(var(--steel) / <alpha-value>)",
        oxide: "rgb(var(--oxide) / <alpha-value>)",
        copper: "rgb(var(--copper) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { none: "0", sm: "2px", DEFAULT: "2px", md: "2px", lg: "2px" },
      letterSpacing: { spec: "0.06em" },
      boxShadow: { stamp: "4px 4px 0 0 rgb(var(--ink))", "stamp-sm": "2px 2px 0 0 rgb(var(--ink))" },
      fontSize: { hero: ["clamp(3.5rem, 9vw, 8rem)", { lineHeight: "0.92", letterSpacing: "-0.02em" }] },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { marquee: "marquee 40s linear infinite" },
    },
  },
  plugins: [],
};

export default config;
