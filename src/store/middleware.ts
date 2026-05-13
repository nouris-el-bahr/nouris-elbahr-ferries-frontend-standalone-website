/**
 * Redux Middleware
 * Custom middleware for logging, performance monitoring, and debugging
 */

import type { Middleware, AnyAction } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "./index";
import { APP_CONFIG } from "@/config/app";

/**
 * Logging Middleware
 * Logs actions and state changes in development mode
 */
export const loggingMiddleware: Middleware<{}, RootState, AppDispatch> =
  (store) => (next) => (action) => {
    const typedAction = action as AnyAction;
    if (!APP_CONFIG.features.debugMode) {
      return next(action);
    }

    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    console.group(`[Redux] ${typedAction.type}`);
    console.log("Previous State:", prevState);
    console.log("Action:", action);
    console.log("Next State:", nextState);
    console.groupEnd();

    return result;
  };

/**
 * Performance Monitoring Middleware
 * Logs action execution time in development mode
 */
export const performanceMiddleware: Middleware<{}, RootState, AppDispatch> =
  () => (next) => (action) => {
    const typedAction = action as AnyAction;
    if (!APP_CONFIG.features.debugMode) {
      return next(action);
    }

    const startTime = performance.now();
    const result = next(action);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log slow actions (> 16ms, one frame at 60fps)
    if (duration > 16) {
      console.warn(
        `[Performance] Action ${typedAction.type} took ${duration.toFixed(2)}ms`
      );
    }

    return result;
  };

/**
 * Error Handling Middleware
 * Catches and logs errors from async actions
 */
export const errorHandlingMiddleware: Middleware<{}, RootState, AppDispatch> =
  () => (next) => (action) => {
    const typedAction = action as AnyAction;
    try {
      return next(action);
    } catch (error) {
      console.error(`[Redux Error] Action ${typedAction.type} threw:`, error);
      throw error;
    }
  };
