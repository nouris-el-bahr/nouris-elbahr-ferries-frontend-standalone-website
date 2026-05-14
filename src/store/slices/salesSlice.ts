import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { SalesConfig, SalesRunResult, runSales } from "@/lib/engine/salesEngine";

interface SalesState {
  downloadDate:      string;
  vatSuffix:         string;
  format:            string;
  mode:              string;
  onlyCheckedIn:     boolean;
  splitByDeparture:  boolean;
  running:           boolean;
  error:             string;
}

const initialState: SalesState = {
  downloadDate:      "",
  vatSuffix:         ". Vat",
  format:            "Csv",
  mode:              "short",
  onlyCheckedIn:     false,
  splitByDeparture:  false,
  running:           false,
  error:             "",
};

export const runSalesReport = createAsyncThunk<
  SalesRunResult,
  { config: SalesConfig; files: File[] },
  { rejectValue: string }
>(
  "sales/runReport",
  async ({ config, files }, { rejectWithValue }) => {
    try {
      return await runSales(config, files);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    setDownloadDate(state, action: PayloadAction<string>)     { state.downloadDate     = action.payload; },
    setVatSuffix(state, action: PayloadAction<string>)        { state.vatSuffix        = action.payload; },
    setFormat(state, action: PayloadAction<string>)           { state.format           = action.payload; },
    setMode(state, action: PayloadAction<string>)             { state.mode             = action.payload; },
    setOnlyCheckedIn(state, action: PayloadAction<boolean>)   { state.onlyCheckedIn    = action.payload; },
    setSplitByDeparture(state, action: PayloadAction<boolean>) { state.splitByDeparture = action.payload; },
    setError(state, action: PayloadAction<string>)            { state.error            = action.payload; },
    clearError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSalesReport.pending, (state) => {
        state.running = true;
        state.error = "";
      })
      .addCase(runSalesReport.fulfilled, (state) => {
        state.running = false;
        state.error = "";
      })
      .addCase(runSalesReport.rejected, (state, action) => {
        state.running = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const {
  setDownloadDate, setVatSuffix, setFormat, setMode, setOnlyCheckedIn, setSplitByDeparture,
  setError, clearError,
} = salesSlice.actions;
export default salesSlice.reducer;
