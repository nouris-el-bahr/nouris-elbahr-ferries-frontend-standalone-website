/**
 * useAsync Hook
 * Manages async operation state (loading, error, success)
 */

import { useState, useCallback, useRef } from "react";

interface UseAsyncState<T> {
  status: "idle" | "pending" | "success" | "error";
  data: T | null;
  error: Error | null;
}

interface UseAsyncOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options?: UseAsyncOptions
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState({ status: "pending", data: null, error: null });

    try {
      const response = await asyncFunction();

      if (isMountedRef.current) {
        setState({ status: "success", data: response, error: null });
        options?.onSuccess?.(response);
      }

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (isMountedRef.current) {
        setState({ status: "error", data: null, error: err });
        options?.onError?.(err);
      }

      throw err;
    }
  }, [asyncFunction, options]);

  const reset = useCallback(() => {
    setState({ status: "idle", data: null, error: null });
  }, []);

  return {
    execute,
    reset,
    ...state,
    isLoading: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
