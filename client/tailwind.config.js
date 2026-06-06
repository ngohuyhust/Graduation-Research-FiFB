export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0f172a",
        "ink-light": "#1e293b",
        "ink-muted": "#334155",
        mint: "#10b981",
        "mint-light": "#34d399",
        coral: "#ef6f6c",
        steel: "#3b82f6",
        "steel-light": "#60a5fa",
        surface: "#f8fafc",
        "surface-card": "#ffffff",
        "surface-hover": "#f1f5f9",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)",
        card: "0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05)",
        glow: "0 0 20px rgba(16,185,129,0.15)",
        "inner-glow": "inset 0 1px 2px rgba(16,185,129,0.1)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite linear",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
