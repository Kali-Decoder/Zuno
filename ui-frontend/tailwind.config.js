/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./constants/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [require("daisyui"), require("tailwindcss-animate")],
  theme: {
    extend: {
      backgroundImage: {
        "primary-radial":
          "radial-gradient(69.73% 69.73% at 49.99% 30.27%, rgba(14, 22, 27, 0) 0%, rgba(14, 22, 27, 0.2) 74.73%, rgba(14, 22, 27, 0.8) 100%)",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        white: "hsl(var(--color-white))",
        primary: {
          300: "hsl(var(--color-primary-300))",
          400: "hsl(var(--color-primary-400))",
          500: "hsl(var(--color-primary-500))",
          800: "hsl(var(--color-primary-800))",
        },
        accent: {
          500: "hsl(var(--color-accent-500))",
          600: "hsl(var(--color-accent-600))",
        },
        success: {
          500: "hsl(var(--color-success-500))",
          800: "hsl(var(--color-success-800))",
        },
        warning: {
          500: "hsl(var(--color-warning-500))",
          800: "hsl(var(--color-warning-800))",
        },
        danger: {
          500: "hsl(var(--color-danger-500))",
          600: "hsl(var(--color-danger-600))",
        },
        yellow: {
          500: "hsl(var(--color-yellow-500))",
        },
      },
      screens: {
        sm: "768px",
      },
      fontFamily: {
        sans: ["var(--font-manrope-sans)", "system-ui", "sans-serif"],
        area: ["var(--font-area-normal)", "var(--font-manrope-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        shine: "shine 5s infinite linear",
        shake: "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
        float: "float 4s ease-in-out infinite",
        "zuno-pulse": "zuno-pulse 1.15s ease-in-out infinite",
        "zuno-glow": "zuno-glow 1.4s ease-in-out infinite",
        "zuno-spin": "zuno-spin 1.1s linear infinite",
      },
      keyframes: {
        shine: {
          "0%": {
            backgroundPosition: "0px",
          },
          "100%": {
            backgroundPosition: "1000px",
          },
        },
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "zuno-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.9)", opacity: "0.85" },
        },
        "zuno-glow": {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.92)" },
          "50%": { opacity: "0.85", transform: "scale(1.08)" },
        },
        "zuno-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },

        float: {
          "0%, 100%": {
            transform: "translateY(0px) rotate(0deg)",
          },
          "50%": {
            transform: "translateY(-6px) rotate(2deg)",
          },
        },
      },
    },
  },
};
