/**
 * useFileUpload Hook
 * Manages file upload state and validation
 */

import { useState, useCallback } from "react";
import { FILE_VALIDATION } from "@/constants/validation";

interface FileUploadState {
  files: File[];
  isLoading: boolean;
  error: string | null;
}

interface UseFileUploadOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  multiple?: boolean;
  onSuccess?: (files: File[]) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options?: UseFileUploadOptions) {
  const [state, setState] = useState<FileUploadState>({
    files: [],
    isLoading: false,
    error: null,
  });

  const maxSize = options?.maxSize || FILE_VALIDATION.MAX_SIZE;
  const allowedExtensions = options?.allowedExtensions || FILE_VALIDATION.ALLOWED_EXTENSIONS;
  const multiple = options?.multiple ?? false;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSize) {
        return `Le fichier "${file.name}" dépasse la limite de ${Math.round(maxSize / 1024 / 1024)}MB`;
      }

      // Check file extension
      const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase() as ".csv" | ".xlsx" | ".xls";
      if (!allowedExtensions.includes(extension)) {
        return `Le format "${extension}" n'est pas autorisé. Formats acceptés: ${allowedExtensions.join(", ")}`;
      }

      return null;
    },
    [maxSize, allowedExtensions]
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles);
      const errors: string[] = [];

      // Validate all files
      newFiles.forEach((file) => {
        const error = validateFile(file);
        if (error) errors.push(error);
      });

      if (errors.length > 0) {
        const errorMessage = errors.join("\n");
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        options?.onError?.(errorMessage);
        return;
      }

      // Set files
      const filesToSet = multiple ? [...state.files, ...newFiles] : newFiles;

      setState({
        files: filesToSet,
        isLoading: false,
        error: null,
      });

      options?.onSuccess?.(filesToSet);
    },
    [state.files, multiple, validateFile, options]
  );

  const removeFile = useCallback(
    (index: number) => {
      setState((prev) => ({
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
      }));
    },
    []
  );

  const clearFiles = useCallback(() => {
    setState({
      files: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    handleFileSelect,
    removeFile,
    clearFiles,
    clearError,
    hasFiles: state.files.length > 0,
  };
}
