/**
 * Redux Selectors for Payment State
 * Uses createSelector for memoization to prevent unnecessary re-renders
 */

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";

// Base selectors
const selectPaymentState = (state: RootState) => state.payment;
const selectFactDate = (state: RootState) => state.payment.factDate;
const selectPeriodStart = (state: RootState) => state.payment.periodStart;
const selectPeriodEnd = (state: RootState) => state.payment.periodEnd;
const selectPaymentRunning = (state: RootState) => state.payment.running;
const selectPaymentError = (state: RootState) => state.payment.error;

// Memoized computed selectors
export const selectPaymentIsValid = createSelector(
  [selectFactDate, selectPeriodStart, selectPeriodEnd],
  (factDate, periodStart, periodEnd) =>
    Boolean(factDate) && Boolean(periodStart) && Boolean(periodEnd)
);

export const selectPaymentDateRange = createSelector(
  [selectFactDate, selectPeriodStart, selectPeriodEnd],
  (factDate, periodStart, periodEnd) => ({
    factDate,
    periodStart,
    periodEnd,
  })
);

export const selectPaymentStatus = createSelector(
  [selectPaymentRunning, selectPaymentError],
  (running, error) => {
    if (running) return "loading";
    if (error) return "error";
    return "idle";
  }
);

// Combined form data selector
export const selectPaymentFormData = createSelector(
  [
    selectFactDate,
    selectPeriodStart,
    selectPeriodEnd,
    selectPaymentIsValid,
    selectPaymentStatus,
    selectPaymentError,
  ],
  (factDate, periodStart, periodEnd, isValid, status, error) => ({
    factDate,
    periodStart,
    periodEnd,
    isValid,
    status,
    error,
  })
);

// Export base selectors
export { selectPaymentState, selectFactDate, selectPeriodStart, selectPeriodEnd, selectPaymentRunning, selectPaymentError };
