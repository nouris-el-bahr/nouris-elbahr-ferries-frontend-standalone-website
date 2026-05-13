/**
 * API client and utilities
 */

import { APP_CONFIG } from "@/config/app";

export interface ApiErrorResponse {
  error: string;
  statusCode: number;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch API client with error handling
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${APP_CONFIG.api.baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    APP_CONFIG.api.timeout
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(response.status, `API Error: ${response.statusText}`, data);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Export existing API
 */
export * from "../api";
