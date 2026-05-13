import { configureStore } from "@reduxjs/toolkit";
import resultsReducer, { addResult, addResults, setFilter, updateResult, removeResult, clearResults } from "../resultsSlice";
import type { Result } from "@/types/domain";

function makeStore() {
  return configureStore({ reducer: { results: resultsReducer } });
}

const MOCK_RESULTS: Result[] = [
  { id: "p1", name: "payment_report", type: "payment", timestamp: 1700000000, status: "success" },
  { id: "s1", name: "sales_report", type: "sales", timestamp: 1700000100, status: "success" },
];

describe("resultsSlice — initial state", () => {
  it("has correct defaults", () => {
    const { results } = makeStore().getState();
    expect(results.ids).toEqual([]);
    expect(results.entities).toEqual({});
    expect(results.loading).toBe(false);
    expect(results.filter).toBe("all");
    expect(results.error).toBe(null);
  });
});

describe("resultsSlice — addResult", () => {
  it("adds a single result", () => {
    const store = makeStore();
    store.dispatch(addResult(MOCK_RESULTS[0]));
    const { results } = store.getState();
    expect(results.ids).toContain("p1");
    expect(results.entities["p1"]).toEqual(MOCK_RESULTS[0]);
  });
});

describe("resultsSlice — addResults", () => {
  it("adds multiple results", () => {
    const store = makeStore();
    store.dispatch(addResults(MOCK_RESULTS));
    const { results } = store.getState();
    expect(results.ids.length).toBe(2);
    expect(results.entities["p1"]).toEqual(MOCK_RESULTS[0]);
    expect(results.entities["s1"]).toEqual(MOCK_RESULTS[1]);
  });
});

describe("resultsSlice — setFilter", () => {
  it("updates filter to payment", () => {
    const store = makeStore();
    store.dispatch(setFilter("payment"));
    expect(store.getState().results.filter).toBe("payment");
  });

  it("updates filter to sales", () => {
    const store = makeStore();
    store.dispatch(setFilter("sales"));
    expect(store.getState().results.filter).toBe("sales");
  });
});

describe("resultsSlice — updateResult", () => {
  it("updates an existing result", () => {
    const store = makeStore();
    store.dispatch(addResult(MOCK_RESULTS[0]));
    store.dispatch(updateResult({ id: "p1", status: "error", errorMessage: "Failed" }));
    const updated = store.getState().results.entities["p1"];
    expect(updated?.status).toBe("error");
    expect(updated?.errorMessage).toBe("Failed");
  });
});

describe("resultsSlice — removeResult", () => {
  it("removes a result by id", () => {
    const store = makeStore();
    store.dispatch(addResults(MOCK_RESULTS));
    store.dispatch(removeResult("p1"));
    const { results } = store.getState();
    expect(results.ids).not.toContain("p1");
    expect(results.entities["p1"]).toBeUndefined();
  });
});

describe("resultsSlice — clearResults", () => {
  it("clears all results and resets state", () => {
    const store = makeStore();
    store.dispatch(addResults(MOCK_RESULTS));
    store.dispatch(setFilter("payment"));
    store.dispatch(clearResults());
    const { results } = store.getState();
    expect(results.ids).toEqual([]);
    expect(results.entities).toEqual({});
    expect(results.filter).toBe("all");
    expect(results.loading).toBe(false);
    expect(results.error).toBe(null);
  });
});
