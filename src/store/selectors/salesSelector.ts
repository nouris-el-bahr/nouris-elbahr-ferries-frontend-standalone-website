/**
 * Redux Selectors for Sales State
 * Uses createSelector for memoization to prevent unnecessary re-renders
 */

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";

// Base selectors
const selectSalesState = (state: RootState) => state.sales;
const selectDownloadDate = (state: RootState) => state.sales.downloadDate;
const selectVatSuffix = (state: RootState) => state.sales.vatSuffix;
const selectSalesFormat = (state: RootState) => state.sales.format;
const selectSalesMode = (state: RootState) => state.sales.mode;
const selectOnlyCheckedIn = (state: RootState) => state.sales.onlyCheckedIn;
const selectSalesRunning = (state: RootState) => state.sales.running;
const selectSalesError = (state: RootState) => state.sales.error;

// Memoized computed selectors
export const selectSalesIsValid = createSelector(
  [selectDownloadDate],
  (downloadDate) => Boolean(downloadDate)
);

export const selectSalesConfig = createSelector(
  [
    selectDownloadDate,
    selectVatSuffix,
    selectSalesFormat,
    selectSalesMode,
    selectOnlyCheckedIn,
  ],
  (downloadDate, vatSuffix, format, mode, onlyCheckedIn) => ({
    downloadDate,
    vatSuffix,
    format,
    mode,
    onlyCheckedIn,
  })
);

export const selectSalesStatus = createSelector(
  [selectSalesRunning, selectSalesError],
  (running, error) => {
    if (running) return "loading";
    if (error) return "error";
    return "idle";
  }
);

export const selectSalesFormatLabel = createSelector(
  [selectSalesFormat],
  (format) => (format === "Csv" ? "CSV" : "Excel")
);

export const selectSalesModeLabel = createSelector(
  [selectSalesMode],
  (mode) => (mode === "short" ? "Court" : "Détaillé")
);

// Combined form data selector
export const selectSalesFormData = createSelector(
  [
    selectDownloadDate,
    selectVatSuffix,
    selectSalesFormat,
    selectSalesMode,
    selectOnlyCheckedIn,
    selectSalesIsValid,
    selectSalesStatus,
    selectSalesError,
  ],
  (
    downloadDate,
    vatSuffix,
    format,
    mode,
    onlyCheckedIn,
    isValid,
    status,
    error
  ) => ({
    downloadDate,
    vatSuffix,
    format,
    mode,
    onlyCheckedIn,
    isValid,
    status,
    error,
  })
);

// Export base selectors
export {
  selectSalesState,
  selectDownloadDate,
  selectVatSuffix,
  selectSalesFormat,
  selectSalesMode,
  selectOnlyCheckedIn,
  selectSalesRunning,
  selectSalesError,
};
