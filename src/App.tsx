import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SqlEditor } from './components/SqlEditor';
import { ResultsGrid } from './components/ResultsGrid';
import { StatsDrawer } from './components/StatsDrawer';
import { HypothesisStudio } from './components/HypothesisStudio';
import { SamplingModal } from './components/SamplingModal';
import { StatisticalGuideModal } from './components/StatisticalGuideModal';
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
import {
  SAMPLE_SALES_CSV,
  SAMPLE_SALARIES_CSV,
  SAMPLE_AB_TEST_CSV,
  SAMPLE_MODE_QUERIES,
  getDynamicTableQueries,
} from './lib/sampleData';
import { TableMeta, QueryResult } from './types';
import { Table, BarChart2, CheckCircle2, AlertCircle, FlaskConical, Upload } from 'lucide-react';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [activeTableName, setActiveTableName] = useState<string>('');
  const [isSampleMode, setIsSampleMode] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'stats' | 'hypothesis'>('results');
  const [selectedStatsColumn, setSelectedStatsColumn] = useState<string>('');
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [isSamplingOpen, setIsSamplingOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('babysql_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('babysql_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
        const existing = fetchTables();
        setTables(existing);
        if (existing.length > 0) {
          setActiveTableName(existing[0].name);
          const q = `SELECT * FROM "${existing[0].name}" LIMIT 50;`;
          setQuery(q);
          const res = executeQuery(q);
          setQueryResult(res);
        } else {
          setQuery('');
          setQueryResult(null);
        }
        setIsReady(true);
      } catch (err: any) {
        console.error('Initialization error:', err);
        showToast(`Failed to initialize SQLite: ${err.message}`, 'error');
        setIsReady(true);
      }
    };
    bootstrap();
  }, []);

  const handleSelectTableQuery = (tableName: string) => {
    setActiveTableName(tableName);
    const q = `SELECT * FROM "${tableName}" LIMIT 50;`;
    setQuery(q);
    runQuery(q);
    setActiveTab('results');
  };

  const handleProfileTable = (tableName: string) => {
    setActiveTableName(tableName);
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

  const handleToggleSampleMode = async () => {
    if (!isSampleMode) {
      try {
        await ingestCsvString(SAMPLE_SALES_CSV, { tableName: 'ecommerce_sales' });
        await ingestCsvString(SAMPLE_SALARIES_CSV, { tableName: 'employee_salaries' });
        await ingestCsvString(SAMPLE_AB_TEST_CSV, { tableName: 'ab_test_experiment' });
        setIsSampleMode(true);
        refreshTables();
        handleSelectTableQuery('ecommerce_sales');
        showToast('Sample Mode enabled: loaded demo sales, salaries & A/B test tables.');
      } catch (err: any) {
        showToast(`Failed to enable sample mode: ${err.message}`, 'error');
      }
    } else {
      if (window.confirm('Exit Sample Mode and clear demo tables?')) {
        executeQuery('DROP TABLE IF EXISTS "ecommerce_sales";');
        executeQuery('DROP TABLE IF EXISTS "employee_salaries";');
        executeQuery('DROP TABLE IF EXISTS "ab_test_experiment";');
        setIsSampleMode(false);
        refreshTables();
        const remaining = fetchTables();
        if (remaining.length > 0) {
          handleSelectTableQuery(remaining[0].name);
        } else {
          setQueryResult(null);
          setQuery('');
        }
        showToast('Exited Sample Mode.');
      }
    }
  };

  const dynamicQueryChips = useMemo(() => {
    if (isSampleMode) {
      return SAMPLE_MODE_QUERIES;
    }
    const targetTable = activeTableName || (tables.length > 0 ? tables[0].name : '');
    if (targetTable) {
      return getDynamicTableQueries(targetTable);
    }
    return [];
  }, [isSampleMode, activeTableName, tables]);

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

  const handleResetDb = async () => {
    if (window.confirm('Clear all tables and reset the SQLite database?')) {
      await resetDatabase();
      setIsSampleMode(false);
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
    <div className="h-screen flex flex-col bg-background text-slate-900 dark:text-slate-100 overflow-hidden select-none">
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
        onToggleSampleMode={handleToggleSampleMode}
        isSampleMode={isSampleMode}
        onResetDb={handleResetDb}
        isReady={isReady}
        tableCount={tables.length}
        onOpenSampling={() => setIsSamplingOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
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
            queryChips={dynamicQueryChips}
            isSampleMode={isSampleMode}
            onExitSampleMode={handleToggleSampleMode}
            activeTableName={activeTableName}
          />

          {/* Tab Navigation */}
          <div className="h-9 px-3 border-b border-border bg-surface flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all ${
                  activeTab === 'results'
                    ? 'bg-surface-raised text-cyan-700 dark:text-cyan-400 border-b-2 border-primary font-semibold'
                    : 'text-slate-600 dark:text-muted hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Query Results</span>
                {queryResult && (
                  <span className="text-[10px] font-mono px-1 rounded bg-background text-slate-700 dark:text-slate-300 font-medium">
                    {queryResult.rowCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all ${
                  activeTab === 'stats'
                    ? 'bg-surface-raised text-cyan-700 dark:text-cyan-400 border-b-2 border-primary font-semibold'
                    : 'text-slate-600 dark:text-muted hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Statistical Analysis</span>
                <span className="text-[10px] uppercase font-mono px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
                  Stats
                </span>
              </button>

              <button
                onClick={() => setActiveTab('hypothesis')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all ${
                  activeTab === 'hypothesis'
                    ? 'bg-surface-raised text-cyan-700 dark:text-cyan-400 border-b-2 border-primary font-semibold'
                    : 'text-slate-600 dark:text-muted hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Hypothesis Testing Studio</span>
                <span className="text-[10px] uppercase font-mono px-1 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold">
                  Business Models
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Half: Result Grid OR Statistical Profiler OR Hypothesis Studio */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'results' ? (
              <ResultsGrid
                result={queryResult}
                onOpenUploader={() => setIsUploaderOpen(true)}
                onLaunchSampleMode={handleToggleSampleMode}
              />
            ) : activeTab === 'stats' ? (
              <StatsDrawer
                columns={queryResult?.columns || []}
                values={queryResult?.values || []}
                initialColumn={selectedStatsColumn}
              />
            ) : (
              <HypothesisStudio
                tables={tables}
                activeTableName={activeTableName}
                onSampleCreated={(newTableName, count) => {
                  refreshTables();
                  handleSelectTableQuery(newTableName);
                  showToast(`Sample table "${newTableName}" (${count} rows) created!`);
                }}
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

      {/* Global Sampling & Simulation Modal */}
      <SamplingModal
        isOpen={isSamplingOpen}
        onClose={() => setIsSamplingOpen(false)}
        tables={tables}
        defaultTable={activeTableName}
        onSampleCreated={(newTableName, count) => {
          refreshTables();
          handleSelectTableQuery(newTableName);
          showToast(`Sample table "${newTableName}" (${count} rows) created!`);
        }}
      />

      {/* Global Statistical Guide Modal */}
      <StatisticalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectTest={() => {
          setActiveTab('hypothesis');
        }}
      />
    </div>
  );
};
