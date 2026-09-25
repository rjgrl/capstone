import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0c2340",
          2: "#16365c",
          3: "#214a78",
        },
        gold: {
          DEFAULT: "#a6842c",
          2: "#c4a35a",
        },
        paper: "#f6f3ee",
        ink: "#1c2430",
        line: "#e4ddd2",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12, 35, 64, 0.06), 0 8px 24px rgba(12, 35, 64, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
