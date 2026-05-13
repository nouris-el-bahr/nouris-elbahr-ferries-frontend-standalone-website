import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isFullWidth = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={isFullWidth ? "w-full" : ""}>
        {label && (
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor={props.id}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white",
              "focus:outline-none focus:ring-2 focus:ring-nouris focus:border-transparent",
              "transition-all duration-200",
              "placeholder:text-gray-400",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              error
                ? `border-error focus:ring-error`
                : "border-gray-200 hover:border-gray-300",
              leftIcon ? "pl-9" : undefined,
              rightIcon ? "pr-9" : undefined,
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-error text-sm mt-1">{error}</p>
        )}

        {helperText && !error && (
          <p className="text-gray-500 text-sm mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
