import Papa from 'papaparse';
import { getDatabase } from './sqliteEngine';

export interface IngestOptions {
  tableName?: string;
  hasHeader?: boolean;
}

export interface IngestResult {
  tableName: string;
  rowCount: number;
  columnCount: number;
  columns: { name: string; type: string }[];
  durationMs: number;
}

export function sanitizeIdentifier(name: string): string {
  let clean = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  clean = clean.replace(/^_+|_+$/g, '');
  if (!clean || /^[0-9]/.test(clean)) {
    clean = `t_${clean || 'data'}`;
  }
  return clean;
}

export function inferSqlType(values: any[]): string {
  const samples = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (samples.length === 0) return 'TEXT';

  let isInt = true;
  let isReal = true;
  let isBool = true;

  for (const val of samples.slice(0, 100)) {
    const s = String(val).trim();
    if (s.toLowerCase() !== 'true' && s.toLowerCase() !== 'false' && s !== '0' && s !== '1') {
      isBool = false;
    }
    if (!/^-?\d+$/.test(s)) {
      isInt = false;
    }
    if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(s)) {
      isReal = false;
    }
  }

  if (isBool) return 'INTEGER';
  if (isInt) return 'INTEGER';
  if (isReal) return 'REAL';
  return 'TEXT';
}

export async function ingestCsvString(
  csvText: string,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const db = getDatabase();
  if (!db) {
    throw new Error('SQLite Engine is not ready.');
  }

  const start = performance.now();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: options.hasHeader ?? true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('CSV file contains no data rows.');
          }

          const rawHeaders = results.meta.fields || Object.keys(results.data[0] as object);
          if (!rawHeaders || rawHeaders.length === 0) {
            throw new Error('Could not parse column headers from CSV.');
          }

          // Clean headers and ensure uniqueness
          const headers: string[] = [];
          const usedHeaders = new Set<string>();
          for (let i = 0; i < rawHeaders.length; i++) {
            let h = sanitizeIdentifier(rawHeaders[i] || `col_${i + 1}`);
            let counter = 1;
            while (usedHeaders.has(h)) {
              h = `${h}_${counter++}`;
            }
            usedHeaders.add(h);
            headers.push(h);
          }

          // Ingest Table Name
          const rawTableName = options.tableName || 'imported_data';
          const tableName = sanitizeIdentifier(rawTableName);

          // Infer types
          const columnTypes: { name: string; type: string }[] = [];
          for (let i = 0; i < headers.length; i++) {
            const rawColKey = rawHeaders[i];
            const sampleColValues = (results.data as any[]).map((row) => row[rawColKey]);
            const inferredType = inferSqlType(sampleColValues);
            columnTypes.push({ name: headers[i], type: inferredType });
          }

          // Create Table SQL
          const colDefs = columnTypes.map((c) => `"${c.name}" ${c.type}`).join(', ');
          const createTableSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});`;

          db.run(`DROP TABLE IF EXISTS "${tableName}";`);
          db.run(createTableSql);

          // Batch insert inside transaction
          db.run('BEGIN TRANSACTION;');

          const placeholders = headers.map(() => '?').join(', ');
          const insertSql = `INSERT INTO "${tableName}" (${headers.map((h) => `"${h}"`).join(', ')}) VALUES (${placeholders});`;
          const stmt = db.prepare(insertSql);

          let insertedCount = 0;
          for (const row of results.data as any[]) {
            const rowValues = rawHeaders.map((colKey, idx) => {
              const val = row[colKey];
              if (val === null || val === undefined || String(val).trim() === '') {
                return null;
              }
              const type = columnTypes[idx].type;
              if (type === 'INTEGER') {
                const s = String(val).trim().toLowerCase();
                if (s === 'true') return 1;
                if (s === 'false') return 0;
                const parsed = parseInt(s, 10);
                return isNaN(parsed) ? null : parsed;
              }
              if (type === 'REAL') {
                const parsed = parseFloat(String(val).trim());
                return isNaN(parsed) ? null : parsed;
              }
              return String(val);
            });

            stmt.run(rowValues);
            insertedCount++;
          }

          stmt.free();
          db.run('COMMIT;');

          const durationMs = Math.round((performance.now() - start) * 100) / 100;

          resolve({
            tableName,
            rowCount: insertedCount,
            columnCount: headers.length,
            columns: columnTypes,
            durationMs,
          });
        } catch (err) {
          try {
            db.run('ROLLBACK;');
          } catch (e) {
            // ignore
          }
          reject(err);
        }
      },
      error: (err: any) => {
        reject(err);
      },
    });
  });
}
