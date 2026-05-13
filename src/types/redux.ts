/**
 * Redux state and action types
 */

import { AsyncState } from "./api";
import { PaymentReport, SalesReport, ConsolidatedReport, Report } from "./domain";

export interface PaymentState extends PaymentReport {
  running: boolean;
  error: string;
}

export interface SalesState extends SalesReport {
  running: boolean;
  error: string;
}

export interface ConsolidatedState extends ConsolidatedReport {
  running: boolean;
  error: string;
}

export type ResultFilter = "all" | "payment" | "sales" | "consolidated";

export interface ResultsState {
  list: Report[];
  filter: ResultFilter;
  loading: boolean;
  error: string | null;
}

export interface SnapshotsState extends AsyncState<Snapshot[]> {
  selectedId: string | null;
}

export interface Snapshot {
  name: string;
  filename: string;
}
