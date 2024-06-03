import * as fs from 'fs';
import * as Papa from 'papaparse';

interface CsvRow {
  [key: string]: string;
}

export const parseCsv = async (filePath: string): Promise<CsvRow[]> => {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return [];
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(fileContent, { header: true });
  const rows = results.data as CsvRow[];

  return rows;
};