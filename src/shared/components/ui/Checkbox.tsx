import React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, error, className, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random()}`;

    return (
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(
              "mt-1 h-4 w-4 rounded border-gray-300 text-nouris",
              "focus:ring-2 focus:ring-nouris focus:ring-offset-0",
              "cursor-pointer",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-error",
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              {label}
            </label>
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

Checkbox.displayName = "Checkbox";
