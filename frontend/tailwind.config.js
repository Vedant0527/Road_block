/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        roadblock: {
          darkest: "#05070a",
          dark: "#080b11",
          card: "#0e131d",
          elevated: "#141b27",
          border: "#1c2638",
          borderLight: "#27354d",
          accent: "#2563eb",
          accentHover: "#1d4ed8",
          gold: "#f59e0b",
          goldMuted: "#b45309",
          emerald: "#10b981",
          rose: "#f43f5e",
        }
      }
    },
  },
  plugins: [],
};
