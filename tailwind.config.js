/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-primary',
    'text-primary',
    'bg-background',
    'text-foreground',
    'border-border',
    'bg-muted',
    'text-muted-foreground',
    'hover:bg-turquoise-600',
    'focus-visible:ring-turquoise-500',
  ],
  theme: {
    extend: {
      colors: {
        // OpenAI-inspired neutral palette with turquoise accent
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Turquoise accent color system
        turquoise: {
          50: "#f0fdfc",
          100: "#ccfbf7",
          200: "#99f6ef",
          300: "#5eebe4",
          400: "#2dd4cc",
          500: "#14b8b3", // Main turquoise
          600: "#0d9289",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        // Semantic colors (CSS variable approach)
        primary: {
          DEFAULT: "#14b8b3",
          50: "#f0fdfc",
          100: "#ccfbf7", 
          200: "#99f6ef",
          300: "#5eebe4",
          400: "#2dd4cc",
          500: "#14b8b3",
          600: "#0d9289",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        accent: "#73EEDC", // Your original turquoise as accent
        background: "#fafafa", // neutral-50
        foreground: "#0a0a0a", // neutral-950
        muted: "#f5f5f5", // neutral-100
        "muted-foreground": "#737373", // neutral-500
        border: "#e5e5e5", // neutral-200
        input: "#ffffff",
        ring: "#14b8b3", // primary focus ring
      },
      fontFamily: {
        // OpenAI-inspired typography system
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Charter", "Georgia", "serif"],
        mono: ["Menlo", "Monaco", "Courier New", "monospace"],
      },
      fontSize: {
        // OpenAI-inspired typography scale
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
      },
      borderRadius: {
        none: "0px",
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      minHeight: {
        touch: "44px", // Minimum touch target size for accessibility
      },
      minWidth: {
        touch: "44px", // Minimum touch target size for accessibility
      },
    },
  },
  plugins: [],
};
