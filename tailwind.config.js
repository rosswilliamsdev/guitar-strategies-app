/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary brand colors
          turquoise: "#73EEDC",
          tiffany: "#73C2BE",
          black: "#04030F",
          white: "#F0EAD6",
          // Secondary & functional colors
          orange: "#D97829",
          violet: "#776885", // Student accent
          purple: "#5F1A37", // Teacher accent
          gray: "#3E3B3E",
        },
        // Semantic color mappings
        student: {
          primary: "#776885", // Chinese Violet
          hover: "#6b5d7a",
          light: "#8a7692",
        },
        teacher: {
          primary: "#5F1A37", // Tyrian Purple
          hover: "#4d1529",
          light: "#722040",
        },
        admin: {
          primary: "#04030F", // Rich Black
          hover: "#1a1a1a",
          light: "#2d2d2d",
        },
        // Action colors
        cta: {
          primary: "#D97829", // Orange for all CTAs
          hover: "#c2681e",
          light: "#e08940",
        },
      },
      fontFamily: {
        // Typography system from design docs
        display: ['"Playfair Display SC"', "serif"],
        body: ["Georgia", "serif"],
        ui: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Custom font sizes matching design system
        "display-xl": ["2.5rem", { lineHeight: "1.2", fontWeight: "400" }], // H1
        "display-lg": ["2rem", { lineHeight: "1.3", fontWeight: "400" }], // H2
        "display-md": ["1.5rem", { lineHeight: "1.4", fontWeight: "400" }], // H3
        "display-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "400" }], // H4
        "body-lg": ["1.125rem", { lineHeight: "1.6" }], // Large body
        body: ["1rem", { lineHeight: "1.6" }], // Regular body
        "body-sm": ["0.875rem", { lineHeight: "1.5" }], // Small body
        ui: ["1rem", { lineHeight: "1.5", fontWeight: "500" }], // Navigation
        "ui-button": ["0.875rem", { lineHeight: "1.4", fontWeight: "600" }], // Buttons
        "ui-label": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }], // Form labels
        "ui-caption": ["0.75rem", { lineHeight: "1.3", fontWeight: "400" }], // Captions
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 4px 6px rgba(0, 0, 0, 0.1)",
        button: "0 1px 2px rgba(0, 0, 0, 0.1)",
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
