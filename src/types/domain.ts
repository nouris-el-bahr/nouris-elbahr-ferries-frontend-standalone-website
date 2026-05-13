/**
 * Domain types for reports and results
 */

export type ReportType = "payment" | "sales" | "consolidated";

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  timestamp: number;
  filename?: string;
}

export interface Result extends Report {
  status: "pending" | "success" | "error";
  errorMessage?: string;
}

export interface PaymentReport {
  factDate: string;
  periodStart: string;
  periodEnd: string;
}

export interface SalesReport {
  downloadDate: string;
  vatSuffix: string;
  format: "Csv" | "Xlsx";
  mode: "short" | "detailed";
  onlyCheckedIn: boolean;
}

export interface ConsolidatedReport {
  paymentDate: string;
  salesDate: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
}

export interface ValidationError {
  field: string;
  message: string;
}
