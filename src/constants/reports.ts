/**
 * Report-related constants
 */

import { ReportType } from "@/types";

export const REPORT_TYPES = {
  PAYMENT: "payment",
  SALES: "sales",
  CONSOLIDATED: "consolidated",
} as const;

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  payment: "Rapport de paiement",
  sales: "Rapport de ventes",
  consolidated: "Facture consolidée",
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  payment: "Générez la facture et le rapport de paiement groupé",
  sales: "Générez le rapport de ventes détaillé",
  consolidated: "Générez la facture consolidée",
};

export const FILE_FORMATS = {
  CSV: "Csv",
  XLSX: "Xlsx",
} as const;

export const FILE_EXTENSIONS = {
  CSV: [".csv"],
  XLSX: [".xlsx", ".xls"],
} as const;

export const SALES_MODES = {
  SHORT: "short",
  DETAILED: "detailed",
} as const;

export const SALES_MODE_LABELS = {
  short: "Court",
  detailed: "Détaillé",
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export const DEFAULT_REPORT_TIMEOUT = 30000; // 30 seconds
