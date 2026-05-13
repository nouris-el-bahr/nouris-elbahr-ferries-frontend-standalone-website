import { Row } from './common';

export function groupBy<T>(rows: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = String(row[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  return map;
}

export function sumBy(rows: Row[], col: string): number {
  return rows.reduce((sum, row) => {
    const val = typeof row[col] === 'number' ? row[col] : parseFloat(row[col]) || 0;
    return sum + val;
  }, 0);
}

export function countWhere(rows: Row[], predicate: (row: Row) => boolean): number {
  return rows.filter(predicate).length;
}

export interface PivotResult {
  [indexValue: string]: number;
}

export function pivotSum(
  rows: Row[],
  indexCol: string,
  valueCol: string,
  order: string[] = [],
  fillMissing: boolean = true,
  fillValue: number = 0
): PivotResult {
  const grouped = groupBy(rows, indexCol as any);
  const result: PivotResult = {};

  for (const [key, group] of grouped) {
    result[key] = sumBy(group, valueCol);
  }

  // Reindex to order
  if (order.length > 0) {
    const reindexed: PivotResult = {};
    for (const k of order) {
      reindexed[k] = result[k] ?? (fillMissing ? fillValue : 0);
    }
    return reindexed;
  }

  return result;
}

export interface PivotMultiResult {
  [indexValue: string]: { [valueCol: string]: number };
}

export function pivotSumMulti(
  rows: Row[],
  indexCol: string,
  valueCols: string[],
  order: string[] = [],
  fillMissing: boolean = true,
  fillValue: number = 0
): PivotMultiResult {
  const grouped = groupBy(rows, indexCol as any);
  const result: PivotMultiResult = {};

  for (const [key, group] of grouped) {
    result[key] = {};
    for (const col of valueCols) {
      result[key][col] = sumBy(group, col);
    }
  }

  // Reindex to order
  if (order.length > 0) {
    const reindexed: PivotMultiResult = {};
    for (const k of order) {
      reindexed[k] = result[k] ?? {};
      for (const col of valueCols) {
        if (!reindexed[k][col]) {
          reindexed[k][col] = fillMissing ? fillValue : 0;
        }
      }
    }
    return reindexed;
  }

  return result;
}

export function dropZeroCols(rows: Row[], skipCols: string[] = []): Row[] {
  if (rows.length === 0) return rows;

  // Find all columns that are numeric and have all zero values (except skipped ones)
  const allKeys = Object.keys(rows[0]);
  const zeroCols = new Set<string>();

  for (const key of allKeys) {
    if (skipCols.includes(key)) continue;

    const isZero = rows.every((row) => {
      const val = row[key];
      const num = typeof val === 'number' ? val : parseFloat(val) || 0;
      return num === 0;
    });

    if (isZero) {
      zeroCols.add(key);
    }
  }

  // Filter rows to remove zero columns
  return rows.map((row) => {
    const newRow: Row = {};
    for (const key of allKeys) {
      if (!zeroCols.has(key)) {
        newRow[key] = row[key];
      }
    }
    return newRow;
  });
}

export function flattenDict(
  d: Record<string, any>,
  parentKey: string = '',
  sep: string = '_'
): Record<string, any> {
  // If dict has exactly one key, unwrap one level
  if (typeof d === 'object' && !Array.isArray(d)) {
    const keys = Object.keys(d);
    if (keys.length === 1) {
      d = d[keys[0]];
    }
  }

  const items: [string, any][] = [];
  for (const [k, v] of Object.entries(d)) {
    const newKey = parentKey ? `${parentKey}${sep}${k}` : k;
    if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      items.push(...Object.entries(flattenDict(v, newKey, sep)));
    } else {
      items.push([newKey, v]);
    }
  }
  return Object.fromEntries(items);
}
