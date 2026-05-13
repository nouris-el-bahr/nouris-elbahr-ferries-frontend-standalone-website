/**
 * Design Tokens
 * Centralized design system constants for colors, spacing, typography, etc.
 */

// Color Palette
export const COLORS = {
  // Brand colors
  primary: "#3EC0F0", // Nouris light blue
  primaryDark: "#35A5CC", // Nouris darker blue
  navy: "#1F1D3A", // Nouris navy
  navyMid: "#2a2850", // Nouris navy mid

  // Grayscale
  white: "#FFFFFF",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  // Semantic colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Semantic backgrounds
  successBg: "#ECFDF5",
  warningBg: "#FFFBEB",
  errorBg: "#FEF2F2",
  infoBg: "#EFF6FF",

  // Semantic text
  successText: "#065F46",
  warningText: "#92400E",
  errorText: "#7F1D1D",
  infoText: "#1E40AF",
} as const;

// Spacing Scale (4px base)
export const SPACING = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// Typography Scale
export const TYPOGRAPHY = {
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
    loose: "2",
  },
} as const;

// Border Radius
export const RADIUS = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px",
} as const;

// Shadows
export const SHADOWS = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
} as const;

// Transitions
export const TRANSITIONS = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  verySlow: "500ms",
} as const;

// Z-Index Scale
export const Z_INDEX = {
  hide: "-1",
  auto: "auto",
  base: "0",
  dropdown: "1000",
  sticky: "1100",
  fixed: "1200",
  backdrop: "1300",
  offcanvas: "1400",
  modal: "1500",
  popover: "1600",
  tooltip: "1700",
} as const;

// Breakpoints
export const BREAKPOINTS = {
  xs: "320px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// Component Variants
export const BUTTON_VARIANTS = {
  primary: {
    bg: COLORS.primary,
    text: COLORS.white,
    hover: COLORS.primaryDark,
  },
  secondary: {
    bg: COLORS.navy,
    text: COLORS.white,
    hover: COLORS.navyMid,
  },
  outline: {
    bg: COLORS.white,
    text: COLORS.navy,
    border: COLORS.gray[300],
    hover: COLORS.gray[50],
  },
  ghost: {
    bg: "transparent",
    text: COLORS.navy,
    hover: COLORS.gray[100],
  },
  danger: {
    bg: COLORS.error,
    text: COLORS.white,
    hover: "#DC2626",
  },
  success: {
    bg: COLORS.success,
    text: COLORS.white,
    hover: "#059669",
  },
} as const;

export const BUTTON_SIZES = {
  sm: {
    padding: `${SPACING[1]} ${SPACING[3]}`,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  md: {
    padding: `${SPACING[2]} ${SPACING[4]}`,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  lg: {
    padding: `${SPACING[3]} ${SPACING[5]}`,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
} as const;

// Form Component Sizes
export const INPUT_SIZES = {
  sm: {
    padding: `${SPACING[1]} ${SPACING[3]}`,
    fontSize: TYPOGRAPHY.fontSize.sm,
    height: "32px",
  },
  md: {
    padding: `${SPACING[2]} ${SPACING[3]}`,
    fontSize: TYPOGRAPHY.fontSize.base,
    height: "40px",
  },
  lg: {
    padding: `${SPACING[2]} ${SPACING[4]}`,
    fontSize: TYPOGRAPHY.fontSize.lg,
    height: "48px",
  },
} as const;

// Animation Keyframes
export const ANIMATIONS = {
  fadeIn: {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  slideInUp: {
    from: { transform: "translateY(10px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  slideInDown: {
    from: { transform: "translateY(-10px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  spin: {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
  pulse: {
    "0%, 100%": { opacity: "1" },
    "50%": { opacity: "0.5" },
  },
} as const;
