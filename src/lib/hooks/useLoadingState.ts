/**
 * useLoadingState Hook
 * State machine for loading, success, and error states
 */

import { useState, useCallback } from "react";

interface LoadingState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
}

export function useLoadingState(initialMessage?: string) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: initialMessage || null,
  });

  const setLoading = useCallback(() => {
    setState({
      isLoading: true,
      isSuccess: false,
      isError: false,
      error: null,
    });
  }, []);

  const setSuccess = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    });
  }, []);

  const setError = useCallback((error: string) => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: true,
      error,
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
  }, []);

  const clear = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    setLoading,
    setSuccess,
    setError,
    reset,
    clear,
  };
}
