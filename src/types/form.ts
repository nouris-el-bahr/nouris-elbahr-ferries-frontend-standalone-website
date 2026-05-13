/**
 * Form-related types
 */

export interface FormFieldError {
  type: "required" | "pattern" | "custom" | "validation";
  message: string;
}

export interface FormFieldState {
  value: string | string[] | boolean;
  error: FormFieldError | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, FormFieldError | null>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

export type ValidationRule = (value: unknown) => string | null;

export interface ValidationRules {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: ValidationRule;
}

export interface FormConfig {
  initialValues: Record<string, unknown>;
  rules?: Record<string, ValidationRules>;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
}
