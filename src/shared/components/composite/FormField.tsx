import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/Input";

interface FormFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      name,
      label,
      type = "text",
      placeholder,
      value,
      error,
      helperText,
      required = false,
      disabled = false,
      onChange,
      onBlur,
      className,
      leftIcon,
      rightIcon,
    },
    ref
  ) => {
    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <Input
          ref={ref}
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          error={error}
          helperText={helperText}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          required={required}
          isFullWidth
        />
      </div>
    );
  }
);

FormField.displayName = "FormField";
