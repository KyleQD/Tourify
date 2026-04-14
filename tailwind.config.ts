import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        "spin-slow": {
          from: {
            transform: "rotate(0deg)",
          },
          to: {
            transform: "rotate(360deg)",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
        },
        "gradient-y": {
          "0%, 100%": {
            "background-position": "50% 0%",
          },
          "50%": {
            "background-position": "50% 100%",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            "box-shadow": "0 0 20px rgba(147, 51, 234, 0.3)",
          },
          "50%": {
            "box-shadow": "0 0 40px rgba(147, 51, 234, 0.6)",
          },
        },
        "shimmer-border": {
          "0%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
          "100%": { "background-position": "0% 50%" },
        },
        "card-entrance": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "glow-ring": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "image-shimmer": {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-15px) translateX(8px)" },
          "50%": { transform: "translateY(-5px) translateX(-6px)" },
          "75%": { transform: "translateY(-20px) translateX(4px)" },
        },
        "orb-drift": {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.15)" },
          "66%": { transform: "translate(-25px, 15px) scale(0.9)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        blob: "blob 7s infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 15s ease infinite",
        "gradient-y": "gradient-y 15s ease infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer-border": "shimmer-border 3s ease infinite",
        "card-entrance": "card-entrance 0.5s ease-out forwards",
        "glow-ring": "glow-ring 2.5s ease-in-out infinite",
        "image-shimmer": "image-shimmer 2s linear infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "orb-drift": "orb-drift 10s ease-in-out infinite",
      },
      boxShadow: {
        "glow-purple": "0 0 15px rgba(147, 51, 234, 0.5)",
        "glow-indigo": "0 0 15px rgba(79, 70, 229, 0.5)",
        "glow-pink": "0 0 15px rgba(236, 72, 153, 0.5)",
        "glow-blue": "0 0 15px rgba(59, 130, 246, 0.5)",
        "glow-green": "0 0 15px rgba(34, 197, 94, 0.5)",
        "glow-red": "0 0 15px rgba(239, 68, 68, 0.5)",
        "3xl": "0 35px 60px -12px rgba(0, 0, 0, 0.25)",
        "4xl": "0 45px 100px -12px rgba(0, 0, 0, 0.25)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontSize: {
        "10xl": ["9rem", { lineHeight: "1" }],
        "11xl": ["10rem", { lineHeight: "1" }],
        "12xl": ["12rem", { lineHeight: "1" }],
      },
      spacing: {
        "128": "32rem",
        "144": "36rem",
      },
      transitionDuration: {
        "2000": "2000ms",
        "3000": "3000ms",
      },
      transitionDelay: {
        "2000": "2000ms",
        "4000": "4000ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
