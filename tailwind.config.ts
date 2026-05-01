import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF9",
        surface: "#FFFFFF",
        border: "#E8E5E0",
        "text-primary": "#1A1714",
        "text-secondary": "#6B6560",
        accent: "#D4601A",
        "accent-light": "#FDF0E8",
        success: "#2D7D52",
        destructive: "#C13B3B",
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "12px",
        button: "8px",
        input: "6px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(26,23,20,0.06), 0 1px 2px -1px rgba(26,23,20,0.06)",
        "card-hover": "0 4px 12px 0 rgba(26,23,20,0.10)",
        "card-elevated": "0 8px 24px 0 rgba(26,23,20,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
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

export default config;