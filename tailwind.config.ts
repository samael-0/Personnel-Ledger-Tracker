import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "var(--color-ground)",
        surface: "var(--color-surface)",
        "surface-subtle": "var(--color-surface-subtle)",
        border: "var(--color-border)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        accent: {
          DEFAULT: "var(--color-accent)",
          ink: "var(--color-accent-ink)",
        },
        neo: {
          yellow: "var(--color-neo-yellow)",
          cyan: "var(--color-neo-cyan)",
          purple: "var(--color-neo-purple)",
          coral: "var(--color-neo-coral)",
          green: "var(--color-neo-green)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        pill: "var(--radius-pill)",
      },
      borderWidth: {
        neo: "2px",
        "neo-thick": "2.5px",
      },
      boxShadow: {
        neo: "var(--shadow-neo)",
        "neo-lg": "var(--shadow-neo-lg)",
        "neo-sm": "var(--shadow-neo-sm)",
      },
    },
  },
  plugins: [],
};

export default config;
