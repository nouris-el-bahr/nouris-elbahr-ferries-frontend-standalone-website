import React from "react";
import { cn } from "@/lib/utils";
import { BUTTON_SIZES, BUTTON_VARIANTS, COLORS } from "@/styles/design-tokens";

type ButtonVariant = keyof typeof BUTTON_VARIANTS;
type ButtonSize = keyof typeof BUTTON_SIZES;

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      isFullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = BUTTON_VARIANTS[variant];

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nouris";

    const sizeStyles = BUTTON_SIZES[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          isFullWidth && "w-full",
          className
        )}
        style={{
          padding: sizeStyles.padding,
          fontSize: sizeStyles.fontSize,
          backgroundColor:
            variant === "outline" ? "white" : variantStyles.bg,
          color:
            variant === "outline" ? variantStyles.text : "white",
          border:
            variant === "outline"
              ? `1px solid ${'border' in variantStyles ? variantStyles.border : COLORS.gray[300]}`
              : "none",
        }}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {leftIcon && !isLoading && <span>{leftIcon}</span>}
        {children}
        {rightIcon && !isLoading && <span>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
