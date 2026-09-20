import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3ead8",
        cream: "#faf6ee",
        ink: "#2b2118",
        bark: "#5c4634",
        seal: "#8f3d2c",
        gold: "#c4a574",
        moss: "#4d5b3c",
        cedar: "#3d2b1f",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(43, 33, 24, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
