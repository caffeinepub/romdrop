import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        neon: "oklch(var(--neon))",
        "neon-dim": "oklch(var(--neon-dim))",
        violet: "oklch(var(--violet))",
        "violet-dim": "oklch(var(--violet-dim))",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "monospace"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0px)",
        sm: "calc(var(--radius) - 2px)",
        xs: "2px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.1)",
        "neon-sm": "0 0 4px oklch(0.78 0.22 165 / 0.35), 0 0 12px oklch(0.78 0.22 165 / 0.12)",
        neon:    "0 0 8px oklch(0.78 0.22 165 / 0.4), 0 0 20px oklch(0.78 0.22 165 / 0.15)",
        "neon-lg": "0 0 16px oklch(0.78 0.22 165 / 0.5), 0 0 40px oklch(0.78 0.22 165 / 0.25)",
        "violet-sm": "0 0 4px oklch(0.62 0.22 285 / 0.35), 0 0 12px oklch(0.62 0.22 285 / 0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulseBorder: {
          "0%, 100%": { boxShadow: "0 0 6px oklch(0.78 0.22 165 / 0.3), inset 0 0 6px oklch(0.78 0.22 165 / 0.05)" },
          "50%": { boxShadow: "0 0 18px oklch(0.78 0.22 165 / 0.7), inset 0 0 12px oklch(0.78 0.22 165 / 0.12)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-border": "pulseBorder 1.5s ease-in-out infinite",
        flicker: "flicker 3s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
