import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          "900": "#1A1A1A",
          "700": "#3D3D3D",
          "500": "#6B6B6B",
          "300": "#9C9C9C",
          "100": "#D4D4D4",
        },
        paper: {
          "50": "#FAFAF9",
          "100": "#F5F5F3",
          "200": "#EFEFEB",
          "300": "#E5E5E0",
        },
        accent: {
          DEFAULT: "#C4825A",
          dim: "#D9A97A",
          bg: "#FBF4ED",
        },
        red: "#C44E4E",
        green: "#5B8C5B",
        amber: "#C49B4E",
      },
      fontFamily: {
        ui: [
          "var(--font-inter)",
          "-apple-system",
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
        serif: [
          "var(--font-noto-serif-sc)",
          '"Source Han Serif SC"',
          '"Songti SC"',
          '"SimSun"',
          "serif",
        ],
        kai: [
          "var(--font-noto-serif-sc)",
          '"STKaiti"',
          '"KaiTi"',
          "serif",
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.8" }],
        base: ["1rem", { lineHeight: "1.8" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.3" }],
        "2xl": ["1.5rem", { lineHeight: "1.3" }],
        "3xl": ["2rem", { lineHeight: "1.3" }],
        "4xl": ["2.5rem", { lineHeight: "1.3" }],
      },
      spacing: {
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(26, 26, 26, 0.04)",
        md: "0 2px 8px rgba(26, 26, 26, 0.06), 0 1px 2px rgba(26, 26, 26, 0.04)",
        lg: "0 4px 24px rgba(26, 26, 26, 0.08), 0 2px 8px rgba(26, 26, 26, 0.04)",
        xl: "0 8px 48px rgba(26, 26, 26, 0.10), 0 4px 16px rgba(26, 26, 26, 0.06)",
        "2xl": "0 16px 64px rgba(26, 26, 26, 0.12), 0 8px 24px rgba(26, 26, 26, 0.08)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
        "bounce-subtle": "bounceSubtle 1s infinite",
        "pulse-soft": "pulseSoft 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      aspectRatio: {
        "21/9": "21 / 9",
        "21/10": "21 / 10",
        "16/9": "16 / 9",
        "4/3": "4 / 3",
        "3/2": "3 / 2",
        "2/1": "2 / 1",
        "1/1": "1 / 1",
      },
    },
  },
  plugins: [],
};

export default config;
