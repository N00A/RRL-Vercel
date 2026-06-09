import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1A1A2E", light: "#16213E" },
        rojo: "#E94560",
        dorado: "#F5A623",
        verde: "#27AE60",
      },
    },
  },
  plugins: [],
};
export default config;
