import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces — off-white world
        paper: "#FAFAF7",
        card: "#FFFFFF",
        line: "#E9E8E3",
        // Text
        ink: "#1D1D1F",
        sub: "#6E6E73",
        faint: "#AEAEB2",
        // Apple system colors (light)
        up: "#34C759",
        down: "#FF3B30",
        warn: "#FF9500",
        note: "#FFCC00",
        act: "#007AFF",
        teal: "#30B0C7",
        indigo: "#5856D6",
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,29,31,0.04), 0 4px 16px rgba(29,29,31,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
