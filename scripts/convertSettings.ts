import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_DIR = path.join(__dirname, '..', '..', 'Data', 'Settings');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'engine');

interface Agency {
  name: string;
  gsa: string;
  currency: string;
  commission: number;
  active: boolean;
}

interface User {
  gsa: string;
  currency: string;
}

function convertSettings() {
  try {
    // Read Agencies.xlsx
    const agenciesPath = path.join(SETTINGS_DIR, 'Agencies.xlsx');
    const agenciesWorkbook = XLSX.readFile(agenciesPath);
    const agenciesSheet = agenciesWorkbook.Sheets[agenciesWorkbook.SheetNames[0]];
    const agenciesRaw = XLSX.utils.sheet_to_json(agenciesSheet, { defval: '' });

    const agenciesMap: Record<string, Agency> = {};
    agenciesRaw.forEach((row: any) => {
      // The first key in the row is typically the index column
      const keys = Object.keys(row);
      const id = row[keys[0]]; // Get first column value as ID

      if (id && id !== '') {
        agenciesMap[id] = {
          name: row['name'] || '',
          gsa: row['gsa'] || '',
          currency: row['currency'] || 'DZD',
          commission: typeof row['commission'] === 'number' ? row['commission'] : 0,
          active: row['active'] === true || row['active'] === 1,
        };
      }
    });

    // Read Users.xlsx
    const usersPath = path.join(SETTINGS_DIR, 'Users.xlsx');
    const usersWorkbook = XLSX.readFile(usersPath);
    const usersSheet = usersWorkbook.Sheets[usersWorkbook.SheetNames[0]];
    const usersRaw = XLSX.utils.sheet_to_json(usersSheet, { defval: '' });

    const usersMap: Record<string, User> = {};
    usersRaw.forEach((row: any) => {
      const keys = Object.keys(row);
      const id = row[keys[0]];

      if (id && id !== '') {
        usersMap[id] = {
          gsa: row['gsa'] || '',
          currency: row['currency'] || 'DZD',
        };
      }
    });

    // Write JSON files
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'agenciesData.json'),
      JSON.stringify(agenciesMap, null, 2)
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'usersData.json'),
      JSON.stringify(usersMap, null, 2)
    );

    console.log(`✓ Agencies: ${Object.keys(agenciesMap).length} entries`);
    console.log(`✓ Users: ${Object.keys(usersMap).length} entries`);
    console.log(`✓ Files written to ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error converting settings:', error);
    process.exit(1);
  }
}

convertSettings();
