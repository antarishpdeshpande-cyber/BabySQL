import React, { useState, useMemo } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Copy, Check, AlertCircle, Clock, Database, Upload, FlaskConical } from 'lucide-react';
import { QueryResult } from '../types';

interface ResultsGridProps {
  result: QueryResult | null;
  onOpenUploader?: () => void;
  onLaunchSampleMode?: () => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  result,
  onOpenUploader,
  onLaunchSampleMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const columns = result?.columns || [];
  const rawValues = result?.values || [];

  const filteredRows = useMemo(() => {
    if (!rawValues.length) return [];
    let rows = rawValues;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((r) =>
        r.some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term))
      );
    }

    if (sortCol !== null) {
      const colIdx = columns.indexOf(sortCol);
      if (colIdx !== -1) {
        rows = [...rows].sort((a, b) => {
          const valA = a[colIdx];
          const valB = b[colIdx];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortAsc ? valA - valB : valB - valA;
          }
          return sortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        });
      }
    }

    return rows;
  }, [rawValues, searchTerm, sortCol, sortAsc, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleCopyCell = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(text);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const handleExportCsv = () => {
    if (!columns.length || !rawValues.length) return;
    const headerRow = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
    const bodyRows = rawValues.map((row) =>
      row.map((val) => (val === null || val === undefined ? '' : `"${String(val).replace(/"/g, '""')}"`)).join(',')
    );
    const csvContent = [headerRow, ...bodyRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!columns.length || !rawValues.length) return;
    const jsonArr = rawValues.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    const blob = new Blob([JSON.stringify(jsonArr, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted select-none">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-primary mb-3 shadow-inner">
          <Database className="w-7 h-7 stroke-[1.5]" />
        </div>
        <p className="text-sm font-semibold text-slate-200">Welcome to BabySQL</p>
        <p className="text-xs text-muted max-w-sm text-center mt-1">
          Ingest your own CSV file to start querying, or launch Sample Mode to explore demo datasets with guided queries.
        </p>
        <div className="flex items-center gap-2.5 mt-4">
          {onOpenUploader && (
            <button
              onClick={onOpenUploader}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-slate-950 font-medium text-xs transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest CSV</span>
            </button>
          )}
          {onLaunchSampleMode && (
            <button
              onClick={onLaunchSampleMode}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-medium transition-all"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>Launch Sample Mode</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg m-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-danger">SQLite Query Error</h4>
          <pre className="text-xs font-mono text-slate-200 mt-1 whitespace-pre-wrap">{result.error}</pre>
          <div className="mt-2 text-[11px] text-muted flex items-center gap-2">
            <span>Query: <code className="font-mono text-slate-300">{result.query}</code></span>
            <span>•</span>
            <span>Duration: {result.executionTimeMs} ms</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface">
      <div className="h-10 px-3 border-b border-border flex items-center justify-between bg-surface-raised/30 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-mono font-medium">{filteredRows.length.toLocaleString()}</span>
            <span className="text-muted">rows</span>
            {searchTerm && filteredRows.length !== rawValues.length && (
              <span className="text-[10px] text-muted font-mono">(filtered from {rawValues.length})</span>
            )}
          </div>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1 text-[11px] text-muted font-mono">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{result.executionTimeMs} ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-muted" />
            <input
              type="text"
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-6 pr-2 py-0.5 bg-background border border-border rounded text-xs text-slate-200 placeholder:text-muted focus:outline-none focus:border-primary w-40"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-background border border-border text-xs rounded px-1.5 py-0.5 text-slate-300 focus:outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-surface-raised text-slate-300 border border-border transition-all"
            title="Export query results as CSV"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-surface-raised text-slate-300 border border-border transition-all"
            title="Export query results as JSON"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No rows returned by this query.
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead className="bg-surface-raised/70 sticky top-0 z-10 border-b border-border select-none">
              <tr>
                <th className="py-2 px-3 text-[10px] text-muted uppercase font-semibold w-12 text-center border-r border-border/40">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-2 px-3 text-xs text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold cursor-pointer border-r border-border/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{col}</span>
                      <span className="text-[10px] text-cyan-500 dark:text-cyan-400">
                        {sortCol === col ? (sortAsc ? '▲' : '▼') : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedRows.map((row, rIdx) => {
                const globalRowIndex = (page - 1) * pageSize + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="py-1.5 px-3 text-[10px] text-muted text-center border-r border-border/40 bg-surface/40 select-none">
                      {globalRowIndex}
                    </td>
                    {row.map((val, cIdx) => {
                      const displayVal = val === null || val === undefined ? 'NULL' : String(val);
                      const isNull = val === null || val === undefined;
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleCopyCell(displayVal)}
                          className={`py-1.5 px-3 border-r border-border/40 truncate max-w-xs cursor-pointer group relative ${
                            isNull ? 'text-muted italic' : isNum ? 'text-sky-900 dark:text-cyan-300 font-medium' : 'text-slate-900 dark:text-slate-200'
                          }`}
                          title="Click to copy value"
                        >
                          <span className="truncate block">{displayVal}</span>
                          <span className="absolute right-1 top-1.5 hidden group-hover:block bg-surface-raised px-1 rounded text-[9px] text-muted border border-border">
                            {copiedCell === displayVal ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="h-9 px-3 border-t border-border flex items-center justify-between bg-surface-raised/20 text-xs select-none">
        <span className="text-[11px] text-muted">
          Showing {Math.min(filteredRows.length, (page - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredRows.length, page * pageSize)} of {filteredRows.length.toLocaleString()}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous Page"
            title="Previous Page"
            className="p-1 rounded hover:bg-surface-raised text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-muted font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next Page"
            title="Next Page"
            className="p-1 rounded hover:bg-surface-raised text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
