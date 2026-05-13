import type { Config } from "tailwindcss";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "./src/styles/design-tokens";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        nouris: COLORS.primary,
        "nouris-d": COLORS.primaryDark,
        "nouris-navy": COLORS.navy,
        "nouris-navy-mid": COLORS.navyMid,

        // Grayscale
        gray: COLORS.gray,

        // Semantic
        success: COLORS.success,
        warning: COLORS.warning,
        error: COLORS.error,
        info: COLORS.info,
      },
      spacing: SPACING,
      fontSize: TYPOGRAPHY.fontSize,
      fontWeight: TYPOGRAPHY.fontWeight,
      lineHeight: TYPOGRAPHY.lineHeight,
      borderRadius: RADIUS,
      boxShadow: SHADOWS,
      fontFamily: {
        archivo: ["var(--font-archivo)", "sans-serif"],
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      zIndex: {
        hide: "-1",
        dropdown: "1000",
        sticky: "1100",
        fixed: "1200",
        backdrop: "1300",
        offcanvas: "1400",
        modal: "1500",
        popover: "1600",
        tooltip: "1700",
      },
    },
  },
  plugins: [],
};

export default config;
