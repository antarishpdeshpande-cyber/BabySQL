import initSqlJs, { Database } from 'sql.js';
import { ColumnMeta, QueryResult, TableMeta } from '../types';

let dbInstance: Database | null = null;
let SQL: any = null;

export async function getSqlEngine(): Promise<any> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (_file: string) => {
      return '/sql-wasm.wasm';
    },
  });
  return SQL;
}

export async function initDatabase(): Promise<Database> {
  const sql = await getSqlEngine();
  if (!dbInstance) {
    dbInstance = new sql.Database();
  }
  return dbInstance!;
}

export function getDatabase(): Database | null {
  return dbInstance;
}

export function executeQuery(sqlQuery: string): QueryResult {
  const start = performance.now();
  if (!dbInstance) {
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: 'SQLite Engine not initialized.',
      timestamp: new Date().toLocaleTimeString(),
      query: sqlQuery,
    };
  }

  try {
    const trimmed = sqlQuery.trim();
    if (!trimmed) {
      return {
        columns: [],
        values: [],
        rowCount: 0,
        executionTimeMs: 0,
        timestamp: new Date().toLocaleTimeString(),
        query: sqlQuery,
      };
    }

    // Execute query
    const res = dbInstance.exec(trimmed);
    const end = performance.now();
    const duration = Math.round((end - start) * 100) / 100;

    if (res && res.length > 0) {
      const lastResult = res[res.length - 1];
      return {
        columns: lastResult.columns,
        values: lastResult.values,
        rowCount: lastResult.values.length,
        executionTimeMs: duration,
        timestamp: new Date().toLocaleTimeString(),
        query: sqlQuery,
      };
    }

    return {
      columns: ['status'],
      values: [['Query executed successfully. (0 rows returned)']],
      rowCount: 0,
      executionTimeMs: duration,
      timestamp: new Date().toLocaleTimeString(),
      query: sqlQuery,
    };
  } catch (err: any) {
    const end = performance.now();
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs: Math.round((end - start) * 100) / 100,
      error: err.message || String(err),
      timestamp: new Date().toLocaleTimeString(),
      query: sqlQuery,
    };
  }
}

export function fetchTables(): TableMeta[] {
  if (!dbInstance) return [];
  try {
    const tableRes = dbInstance.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;"
    );
    if (!tableRes || tableRes.length === 0 || !tableRes[0].values) {
      return [];
    }

    const tables: TableMeta[] = [];
    for (const row of tableRes[0].values) {
      const tableName = String(row[0]);
      // Get column info
      const colRes = dbInstance.exec(`PRAGMA table_info("${tableName}");`);
      const columns: ColumnMeta[] = [];
      if (colRes && colRes.length > 0) {
        for (const colRow of colRes[0].values) {
          columns.push({
            cid: Number(colRow[0]),
            name: String(colRow[1]),
            type: String(colRow[2]),
            notnull: Number(colRow[3]),
            dflt_value: colRow[4],
            pk: Number(colRow[5]),
          });
        }
      }

      // Get row count
      let rowCount = 0;
      try {
        const countRes = dbInstance.exec(`SELECT COUNT(*) FROM "${tableName}";`);
        if (countRes && countRes[0] && countRes[0].values[0]) {
          rowCount = Number(countRes[0].values[0][0]);
        }
      } catch (e) {
        // ignore
      }

      tables.push({
        name: tableName,
        rowCount,
        columns,
      });
    }

    return tables;
  } catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
}

export function exportDatabaseBinary(): Uint8Array | null {
  if (!dbInstance) return null;
  return dbInstance.export();
}

export async function importDatabaseBinary(data: Uint8Array): Promise<Database> {
  const sql = await getSqlEngine();
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = new sql.Database(data);
  return dbInstance!;
}

export async function resetDatabase(): Promise<Database> {
  const sql = await getSqlEngine();
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = new sql.Database();
  return dbInstance!;
}
