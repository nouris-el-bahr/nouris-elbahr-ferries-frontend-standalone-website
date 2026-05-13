import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import snapshotsReducer from "./slices/snapshotsSlice";
import paymentReducer from "./slices/paymentSlice";
import salesReducer from "./slices/salesSlice";
import resultsReducer from "./slices/resultsSlice";

/**
 * Redux Store Configuration
 * Includes all slices, middleware, and DevTools integration
 */
export const store = configureStore({
  reducer: {
    snapshots: snapshotsReducer,
    payment: paymentReducer,
    sales: salesReducer,
    results: resultsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "payment/runReport/pending",
          "payment/runReport/fulfilled",
          "sales/runReport/pending",
          "sales/runReport/fulfilled",
        ],
        ignoredActionPaths: ["payload", "meta.arg"],
      },
      warnAfter: 128,
    }),
  devTools: process.env.NODE_ENV === "development" ? {
    maxAge: 50, // Number of actions to keep in the DevTools history
    trace: true, // Enable action stack trace
    traceLimit: 25,
  } : false,
});

// Type definitions
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed Redux hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export selectors
export * from "./selectors";
