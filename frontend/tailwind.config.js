/** @type {import('tailwindcss').Config} */

// Colors point at CSS variables (see src/index.css), so one class such as
// `bg-surface` or `text-ink` automatically looks right in light AND dark mode.
// The "<alpha-value>" placeholder keeps opacity utilities like `bg-brand/10` working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        soft: token("soft"),
        field: token("field"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        brand: token("brand"),
        "brand-dark": token("brand-dark"),
        "brand-soft": token("brand-soft"),
        "on-brand": token("on-brand"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.04), 0 4px 16px rgb(var(--shadow) / 0.05)",
        lift: "0 10px 30px rgb(var(--shadow) / 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
