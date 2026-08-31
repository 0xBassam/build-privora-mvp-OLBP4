import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#05070a",
          950: "#030507",
          900: "#070a0f",
          800: "#0c1017",
          700: "#131824",
          600: "#1b2230",
        },
        mist: {
          DEFAULT: "#8a95a6",
          300: "#c4cbd6",
          400: "#a3aebc",
          500: "#8a95a6",
          600: "#69748a",
        },
        accent: {
          DEFAULT: "#33e8c9",
          50: "#e9fffa",
          100: "#c7fff0",
          200: "#93ffe1",
          300: "#5df3d1",
          400: "#33e8c9",
          500: "#17c6ab",
          600: "#0e9d88",
          700: "#0e7c6d",
          glow: "rgba(51, 232, 201, 0.35)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(circle at 50% 0%, rgba(51,232,201,0.14), transparent 60%)",
      },
      backgroundSize: {
        grid: "56px 56px",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-slow-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
        "spin-slow": "spin-slow 40s linear infinite",
        "spin-slow-reverse": "spin-slow-reverse 55s linear infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
