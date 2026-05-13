import React from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  isFullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
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

        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-nouris focus:border-transparent",
            "transition-all duration-200",
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            "appearance-none cursor-pointer",
            error
              ? "border-error focus:ring-error"
              : "border-gray-200 hover:border-gray-300",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
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

Select.displayName = "Select";
