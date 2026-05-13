/**
 * Redux Selectors for Results State
 * Uses entity adapter for normalized state and createSelector for memoization
 */

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { resultsSelectors } from "@/store/slices/resultsSlice";

// Base selectors
const selectResultsState = (state: RootState) => state.results;
const selectResultsFilter = (state: RootState) => state.results.filter;
const selectResultsLoading = (state: RootState) => state.results.loading;
const selectResultsError = (state: RootState) => state.results.error;

// Entity adapter selectors
export const selectResultsIds = createSelector(
  [selectResultsState],
  (state) => resultsSelectors.selectIds(state)
);

export const selectResultsEntities = createSelector(
  [selectResultsState],
  (state) => resultsSelectors.selectEntities(state)
);

export const selectResultsList = createSelector(
  [selectResultsState],
  (state) => resultsSelectors.selectAll(state)
);

export const selectResultById = createSelector(
  [selectResultsState, (_state: RootState, id: string) => id],
  (state, id) => resultsSelectors.selectById(state, id)
);

export const selectTotalResultsCount = createSelector(
  [selectResultsState],
  (state) => resultsSelectors.selectTotal(state)
);

// Count by type selectors
export const selectPaymentResultsCount = createSelector(
  [selectResultsList],
  (results) => results.filter((r) => r.type === "payment").length
);

export const selectSalesResultsCount = createSelector(
  [selectResultsList],
  (results) => results.filter((r) => r.type === "sales").length
);

export const selectConsolidatedResultsCount = createSelector(
  [selectResultsList],
  (results) => results.filter((r) => r.type === "consolidated").length
);

// Filtered results by current filter setting
export const selectFilteredResults = createSelector(
  [selectResultsList, selectResultsFilter],
  (results, filter) => {
    if (filter === "all") return results;
    return results.filter((r) => r.type === filter);
  }
);

// Recent results (last N items)
export const selectRecentResults = createSelector(
  [selectResultsList, (_state: RootState, limit: number = 5) => limit],
  (results, limit) => results.slice(0, limit)
);

// Results by type
export const selectResultsByType = createSelector(
  [selectResultsList, (_state: RootState, type: string) => type],
  (results, type) => results.filter((r) => r.type === type)
);

// Results sorted by date (already sorted by adapter, but explicit for clarity)
export const selectResultsSortedByDate = createSelector(
  [selectResultsList],
  (results) => [...results]
);

// Status and metadata selectors
export const selectHasResults = createSelector(
  [selectTotalResultsCount],
  (count) => count > 0
);

export const selectIsEmpty = createSelector(
  [selectTotalResultsCount],
  (count) => count === 0
);

export const selectResultsStatus = createSelector(
  [selectResultsLoading, selectResultsError, selectIsEmpty],
  (loading, error, isEmpty) => {
    if (loading) return "loading";
    if (error) return "error";
    if (isEmpty) return "empty";
    return "success";
  }
);

// Combined status selector
export const selectResultsWithStatus = createSelector(
  [selectResultsList, selectResultsLoading, selectResultsError, selectResultsStatus],
  (results, loading, error, status) => ({
    results,
    loading,
    error,
    status,
  })
);
