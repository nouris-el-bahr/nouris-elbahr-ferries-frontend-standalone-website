/**
 * API request and response types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FileUploadRequest {
  files: File[];
  metadata?: Record<string, string>;
}

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  url: string;
}

export interface ReportGenerationRequest {
  reportType: string;
  parameters: Record<string, unknown>;
  files: File[];
}

export interface ReportGenerationResponse {
  reportId: string;
  filename: string;
  downloadUrl: string;
  generatedAt: string;
}
