import { createSlice, PayloadAction, createEntityAdapter } from "@reduxjs/toolkit";
import type { Result } from "@/types/domain";

export type ResultFilter = "all" | "payment" | "sales" | "consolidated";

const resultsAdapter = createEntityAdapter<Result, string>({
  selectId: (result) => result.id,
  sortComparer: (a, b) => b.timestamp - a.timestamp, // Recent first
});

interface ResultsState {
  ids: string[];
  entities: { [id: string]: Result };
  filter: ResultFilter;
  loading: boolean;
  error: string | null;
}

const initialState: ResultsState = resultsAdapter.getInitialState({
  filter: "all",
  loading: false,
  error: null,
});

const resultsSlice = createSlice({
  name: "results",
  initialState,
  reducers: {
    addResult(state, action: PayloadAction<Result>) {
      resultsAdapter.addOne(state, action.payload);
    },
    addResults(state, action: PayloadAction<Result[]>) {
      resultsAdapter.addMany(state, action.payload);
    },
    updateResult(state, action: PayloadAction<Partial<Result> & { id: string }>) {
      resultsAdapter.updateOne(state, {
        id: action.payload.id,
        changes: action.payload,
      });
    },
    removeResult(state, action: PayloadAction<string>) {
      resultsAdapter.removeOne(state, action.payload);
    },
    setFilter(state, action: PayloadAction<ResultFilter>) {
      state.filter = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearResults(state) {
      resultsAdapter.removeAll(state);
      state.filter = "all";
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  addResult,
  addResults,
  updateResult,
  removeResult,
  setFilter,
  setLoading,
  setError,
  clearResults,
} = resultsSlice.actions;

export const resultsSelectors = resultsAdapter.getSelectors();
export default resultsSlice.reducer;
