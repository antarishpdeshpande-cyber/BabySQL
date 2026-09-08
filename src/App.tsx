import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SqlEditor } from './components/SqlEditor';
import { ResultsGrid } from './components/ResultsGrid';
import { StatsDrawer } from './components/StatsDrawer';
import { CsvUploader } from './components/CsvUploader';
import {
  initDatabase,
  executeQuery,
  fetchTables,
  exportDatabaseBinary,
  importDatabaseBinary,
  resetDatabase,
} from './lib/sqliteEngine';
import { ingestCsvString } from './lib/csvParser';
import { SAMPLE_SALES_CSV, SAMPLE_SALARIES_CSV } from './lib/sampleData';
import { TableMeta, QueryResult } from './types';
import { Table, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [query, setQuery] = useState<string>('SELECT * FROM ecommerce_sales LIMIT 50;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'stats'>('results');
  const [selectedStatsColumn, setSelectedStatsColumn] = useState<string>('');
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshTables = useCallback(() => {
    const list = fetchTables();
    setTables(list);
  }, []);

  const runQuery = useCallback((sqlText: string) => {
    setIsExecuting(true);
    setTimeout(() => {
      const res = executeQuery(sqlText);
      setQueryResult(res);
      refreshTables();
      setIsExecuting(false);
    }, 10);
  }, [refreshTables]);

  // Initial bootstrap
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        // Load default sample datasets
        await ingestCsvString(SAMPLE_SALES_CSV, { tableName: 'ecommerce_sales' });
        await ingestCsvString(SAMPLE_SALARIES_CSV, { tableName: 'employee_salaries' });
        refreshTables();
        const initialRes = executeQuery('SELECT * FROM ecommerce_sales LIMIT 50;');
        setQueryResult(initialRes);
        setIsReady(true);
      } catch (err: any) {
        console.error('Initialization error:', err);
        showToast(`Failed to initialize SQLite: ${err.message}`, 'error');
        setIsReady(true);
      }
    };
    bootstrap();
  }, [refreshTables]);

  const handleSelectTableQuery = (tableName: string) => {
    const q = `SELECT * FROM "${tableName}" LIMIT 50;`;
    setQuery(q);
    runQuery(q);
    setActiveTab('results');
  };

  const handleProfileTable = (tableName: string) => {
    const q = `SELECT * FROM "${tableName}";`;
    setQuery(q);
    const res = executeQuery(q);
    setQueryResult(res);
    refreshTables();
    if (res.columns.length > 0) {
      setSelectedStatsColumn(res.columns[0]);
    }
    setActiveTab('stats');
  };

  const handleDropTable = (tableName: string) => {
    if (window.confirm(`Are you sure you want to drop table "${tableName}"?`)) {
      executeQuery(`DROP TABLE IF EXISTS "${tableName}";`);
      refreshTables();
      showToast(`Table "${tableName}" dropped.`);
      setQueryResult(null);
    }
  };

  const handleExportDb = () => {
    const binary = exportDatabaseBinary();
    if (!binary) {
      showToast('Database is empty or not initialized.', 'error');
      return;
    }
    const blob = new Blob([binary as any], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `babysql_${Date.now()}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('SQLite database exported successfully.');
  };

  const handleImportDb = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await importDatabaseBinary(new Uint8Array(buffer));
      refreshTables();
      const updatedTables = fetchTables();
      if (updatedTables.length > 0) {
        handleSelectTableQuery(updatedTables[0].name);
      }
      showToast(`Imported database "${file.name}" with ${updatedTables.length} tables.`);
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  };

  const handleLoadSampleData = async () => {
    try {
      await ingestCsvString(SAMPLE_SALES_CSV, { tableName: 'ecommerce_sales' });
      await ingestCsvString(SAMPLE_SALARIES_CSV, { tableName: 'employee_salaries' });
      refreshTables();
      handleSelectTableQuery('ecommerce_sales');
      showToast('Sample tables loaded: ecommerce_sales (100 rows) & employee_salaries (60 rows).');
    } catch (err: any) {
      showToast(`Failed to load samples: ${err.message}`, 'error');
    }
  };

  const handleResetDb = async () => {
    if (window.confirm('Clear all tables and reset the SQLite database?')) {
      await resetDatabase();
      refreshTables();
      setQueryResult(null);
      setQuery('');
      showToast('Database reset to empty state.');
    }
  };

  const handleIngestSuccess = (tableName: string) => {
    refreshTables();
    handleSelectTableQuery(tableName);
    showToast(`CSV ingested into table "${tableName}"!`);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-slate-100 overflow-hidden select-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface border border-border shadow-xl text-xs">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-danger" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <Header
        onOpenUploader={() => setIsUploaderOpen(true)}
        onExportDb={handleExportDb}
        onImportDb={handleImportDb}
        onLoadSampleData={handleLoadSampleData}
        onResetDb={handleResetDb}
        isReady={isReady}
        tableCount={tables.length}
      />

      {/* Main Workspace: Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          tables={tables}
          onSelectTableQuery={handleSelectTableQuery}
          onProfileTable={handleProfileTable}
          onDropTable={handleDropTable}
        />

        {/* Main Content Pane */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* Top Half: SQL Editor */}
          <SqlEditor
            query={query}
            onChange={setQuery}
            onExecute={() => runQuery(query)}
            onClear={() => setQuery('')}
            isExecuting={isExecuting}
          />

          {/* Tab Navigation */}
          <div className="h-9 px-3 border-b border-border bg-surface flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all ${
                  activeTab === 'results'
                    ? 'bg-surface-raised text-cyan-400 border-b-2 border-primary'
                    : 'text-muted hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Query Results</span>
                {queryResult && (
                  <span className="text-[10px] font-mono px-1 rounded bg-background text-slate-300">
                    {queryResult.rowCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all ${
                  activeTab === 'stats'
                    ? 'bg-surface-raised text-cyan-400 border-b-2 border-primary'
                    : 'text-muted hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Statistical Analysis</span>
                <span className="text-[10px] uppercase font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  New
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Half: Result Grid OR Statistical Profiler */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'results' ? (
              <ResultsGrid result={queryResult} />
            ) : (
              <StatsDrawer
                columns={queryResult?.columns || []}
                values={queryResult?.values || []}
                initialColumn={selectedStatsColumn}
              />
            )}
          </div>
        </main>
      </div>

      {/* CSV Ingestion Modal */}
      <CsvUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onIngestSuccess={handleIngestSuccess}
      />
    </div>
  );
};
