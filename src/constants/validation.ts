/**
 * Validation rules and patterns
 */

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  PHONE: /^[\d\s\-\+\(\)]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#[0-9A-F]{6}$/i,
  VAT_NUMBER: /^[A-Z]{2}[0-9A-Z]{2,30}$/,
} as const;

export const VALIDATION_RULES = {
  REQUIRED: {
    required: true,
  },
  EMAIL: {
    required: true,
    pattern: {
      value: VALIDATION_PATTERNS.EMAIL,
      message: "Adresse e-mail invalide",
    },
  },
  DATE: {
    required: true,
    pattern: {
      value: VALIDATION_PATTERNS.DATE,
      message: "Format de date invalide (YYYY-MM-DD)",
    },
  },
  PASSWORD: {
    required: true,
    minLength: {
      value: 8,
      message: "Le mot de passe doit contenir au moins 8 caractères",
    },
  },
  USERNAME: {
    required: true,
    minLength: {
      value: 3,
      message: "Le nom d'utilisateur doit contenir au moins 3 caractères",
    },
    maxLength: {
      value: 30,
      message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères",
    },
  },
  VAT_SUFFIX: {
    minLength: {
      value: 1,
      message: "Suffixe TVA requis",
    },
    maxLength: {
      value: 10,
      message: "Suffixe TVA trop long",
    },
  },
} as const;

export const FILE_VALIDATION = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_EXTENSIONS: [".csv", ".xlsx", ".xls"],
  ALLOWED_MIME_TYPES: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
} as const;

export const FIELD_LENGTHS = {
  MIN_NAME: 1,
  MAX_NAME: 255,
  MIN_DESCRIPTION: 1,
  MAX_DESCRIPTION: 1000,
  MIN_USERNAME: 3,
  MAX_USERNAME: 30,
  MIN_PASSWORD: 8,
  MAX_PASSWORD: 128,
  MIN_VAT_SUFFIX: 1,
  MAX_VAT_SUFFIX: 10,
} as const;
