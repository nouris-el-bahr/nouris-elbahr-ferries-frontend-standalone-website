/**
 * Redux Action Types
 * Centralized action type definitions for consistency
 */

// Payment Actions
export const PAYMENT_ACTIONS = {
  SET_FACT_DATE: "payment/setFactDate",
  SET_PERIOD_START: "payment/setPeriodStart",
  SET_PERIOD_END: "payment/setPeriodEnd",
  SET_ERROR: "payment/setError",
  CLEAR_ERROR: "payment/clearError",
  RUN_REPORT_PENDING: "payment/runReport/pending",
  RUN_REPORT_FULFILLED: "payment/runReport/fulfilled",
  RUN_REPORT_REJECTED: "payment/runReport/rejected",
  RESET: "payment/reset",
} as const;

// Sales Actions
export const SALES_ACTIONS = {
  SET_DOWNLOAD_DATE: "sales/setDownloadDate",
  SET_VAT_SUFFIX: "sales/setVatSuffix",
  SET_FORMAT: "sales/setFormat",
  SET_MODE: "sales/setMode",
  SET_ONLY_CHECKED_IN: "sales/setOnlyCheckedIn",
  SET_ERROR: "sales/setError",
  CLEAR_ERROR: "sales/clearError",
  RUN_REPORT_PENDING: "sales/runReport/pending",
  RUN_REPORT_FULFILLED: "sales/runReport/fulfilled",
  RUN_REPORT_REJECTED: "sales/runReport/rejected",
  RESET: "sales/reset",
} as const;

// Results Actions
export const RESULTS_ACTIONS = {
  ADD_RESULT: "results/addResult",
  ADD_RESULTS: "results/addResults",
  REMOVE_RESULT: "results/removeResult",
  CLEAR_RESULTS: "results/clearResults",
  SET_FILTER: "results/setFilter",
  SET_LOADING: "results/setLoading",
  SET_ERROR: "results/setError",
  CLEAR_ERROR: "results/clearError",
} as const;

// Snapshots Actions
export const SNAPSHOTS_ACTIONS = {
  FETCH_PENDING: "snapshots/fetchSnapshots/pending",
  FETCH_FULFILLED: "snapshots/fetchSnapshots/fulfilled",
  FETCH_REJECTED: "snapshots/fetchSnapshots/rejected",
  SET_SELECTED: "snapshots/setSelected",
} as const;

// Combined action types
export const ALL_ACTIONS = {
  ...PAYMENT_ACTIONS,
  ...SALES_ACTIONS,
  ...RESULTS_ACTIONS,
  ...SNAPSHOTS_ACTIONS,
} as const;
