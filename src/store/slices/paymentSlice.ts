import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { PaymentRunParams, PaymentRunResult, runPayment } from "@/lib/engine/paymentEngine";

interface PaymentState {
  factDate:    string;
  periodStart: string;
  periodEnd:   string;
  running:     boolean;
  error:       string;
}

const initialState: PaymentState = {
  factDate:    "",
  periodStart: "",
  periodEnd:   "",
  running:     false,
  error:       "",
};

export const runPaymentReport = createAsyncThunk<
  PaymentRunResult,
  PaymentRunParams,
  { rejectValue: string }
>(
  "payment/runReport",
  async (params, { rejectWithValue }) => {
    try {
      return await runPayment(params);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setFactDate(state, action: PayloadAction<string>)    { state.factDate    = action.payload; },
    setPeriodStart(state, action: PayloadAction<string>) { state.periodStart = action.payload; },
    setPeriodEnd(state, action: PayloadAction<string>)   { state.periodEnd   = action.payload; },
    setError(state, action: PayloadAction<string>)       { state.error       = action.payload; },
    clearError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runPaymentReport.pending, (state) => {
        state.running = true;
        state.error = "";
      })
      .addCase(runPaymentReport.fulfilled, (state) => {
        state.running = false;
        state.error = "";
      })
      .addCase(runPaymentReport.rejected, (state, action) => {
        state.running = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const {
  setFactDate, setPeriodStart, setPeriodEnd,
  setError, clearError,
} = paymentSlice.actions;
export default paymentSlice.reducer;
