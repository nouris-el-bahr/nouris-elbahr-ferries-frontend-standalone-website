/**
 * Application configuration
 */

export const APP_CONFIG = {
  // App metadata
  name: "Nouris Dashboard",
  description: "Gestion des rapports Nouris El Bahr",
  version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
  environment: process.env.NODE_ENV || "development",

  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10),
  },

  // Feature flags
  features: {
    debugMode: process.env.NEXT_PUBLIC_DEBUG === "true",
    offlineMode: true,
    analytics: process.env.NEXT_PUBLIC_ANALYTICS !== "false",
  },

  // UI configuration
  ui: {
    sidebarCollapsible: true,
    darkModeSupported: false,
    animationsEnabled: true,
  },

  // Report configuration
  reports: {
    defaultFormat: "Csv" as const,
    defaultSalesMode: "short" as const,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    processingTimeout: 30000, // 30 seconds
  },

  // i18n configuration
  i18n: {
    defaultLanguage: "fr",
    supportedLanguages: ["fr", "en"],
  },

  // Security
  security: {
    corsEnabled: true,
    csrfProtection: false, // Can be enabled in production
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
