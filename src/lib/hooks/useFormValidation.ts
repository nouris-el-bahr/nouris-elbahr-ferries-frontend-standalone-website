/**
 * useFormValidation Hook
 * Form validation with real-time feedback
 */

import { useState, useCallback } from "react";
import type { ValidationRules } from "@/types/form";

interface ValidationErrors {
  [key: string]: string | null;
}

export function useFormValidation(
  initialValues: Record<string, string | number | boolean>,
  rules?: Record<string, ValidationRules>
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (name: string, value: unknown) => {
      const fieldRules = rules?.[name];
      if (!fieldRules) return null;

      // Required validation
      if (fieldRules.required) {
        const message =
          typeof fieldRules.required === "string"
            ? fieldRules.required
            : "Ce champ est requis";

        if (value === "" || value === null || value === undefined) {
          return message;
        }
      }

      const stringValue = String(value);

      // Min length validation
      if (fieldRules.minLength) {
        const config =
          typeof fieldRules.minLength === "number"
            ? { value: fieldRules.minLength }
            : fieldRules.minLength;

        if (stringValue.length < config.value) {
          const message =
            ('message' in config && config.message) ||
            `Minimum ${config.value} caractères requis`;
          return message;
        }
      }

      // Max length validation
      if (fieldRules.maxLength) {
        const config =
          typeof fieldRules.maxLength === "number"
            ? { value: fieldRules.maxLength }
            : fieldRules.maxLength;

        if (stringValue.length > config.value) {
          const message =
            ('message' in config && config.message) ||
            `Maximum ${config.value} caractères autorisés`;
          return message;
        }
      }

      // Pattern validation
      if (fieldRules.pattern) {
        if (!fieldRules.pattern.value.test(stringValue)) {
          return (
            fieldRules.pattern.message || "Format invalide"
          );
        }
      }

      // Custom validation
      if (fieldRules.custom) {
        const result = fieldRules.custom(value);
        if (result) return result;
      }

      return null;
    },
    [rules]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      setValues((prev) => ({
        ...prev,
        [name]:
          type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
      }));

      // Real-time validation if field is touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [validateField]
  );

  const validate = useCallback(() => {
    const newErrors: ValidationErrors = {};

    Object.keys(values).forEach((name) => {
      const error = validateField(name, values[name]);
      newErrors[name] = error;
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(values).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );

    return Object.values(newErrors).every((error) => error === null);
  }, [values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.values(errors).every((error) => error === null);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues,
    setError: (name: string, error: string | null) => {
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
  };
}
