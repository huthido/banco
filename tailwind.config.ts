import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        board: "#e3b264",
        boardline: "#7a5523",
      },
    },
  },
  plugins: [],
};

export default config;
