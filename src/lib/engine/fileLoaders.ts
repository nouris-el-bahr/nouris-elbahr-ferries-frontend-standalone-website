import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Row } from './common';

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

export async function parseExcelFile(file: File): Promise<Row[]> {
  try {
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    return rows as Row[];
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error}`);
  }
}

export async function parseCsvFile(
  file: File,
  delimiter: string = ';'
): Promise<Row[]> {
  try {
    const text = await readFileAsText(file);
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        delimiter,
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as Row[]);
        },
        error: (error: any) => {
          reject(new Error(`Failed to parse CSV: ${error?.message || 'Unknown error'}`));
        },
      });
    });
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error}`);
  }
}

export async function parseAnyFile(
  file: File,
  delimiter?: string
): Promise<Row[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCsvFile(file, delimiter);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelFile(file);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

export function generateXlsxBlob(
  sheets: { name: string; rows: Row[] }[]
): Blob {
  const workbook = XLSX.utils.book_new();

  for (const { name, rows } of sheets) {
    if (rows.length === 0) continue;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }

  // Write to buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function generateCsvBlob(rows: Row[], delimiter: string = ';'): Blob {
  const csv = Papa.unparse(rows, { delimiter });
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
