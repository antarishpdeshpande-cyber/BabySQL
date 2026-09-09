import React, { useEffect, useState } from 'react';
import { Play, Eraser, Terminal, Sparkles, FlaskConical, X, Code2, HelpCircle } from 'lucide-react';
import { QueryChip } from '../lib/sampleData';

interface SqlPromptTemplate {
  name: string;
  desc: string;
  template: (tableName: string) => string;
}

const SQL_PROMPT_TEMPLATES: SqlPromptTemplate[] = [
  {
    name: '📊 Group & Count',
    desc: 'Frequency distribution grouped by a column',
    template: (tbl) =>
      `-- Group By & Frequency Count\nSELECT 1 AS column_name, COUNT(*) AS count\nFROM "${tbl}"\nGROUP BY 1\nORDER BY count DESC\nLIMIT 25;`,
  },
  {
    name: '🔍 Filter WHERE',
    desc: 'Filter rows with conditional threshold',
    template: (tbl) =>
      `-- Filter Rows by Condition\nSELECT *\nFROM "${tbl}"\nWHERE rowid <= 50\nLIMIT 50;`,
  },
  {
    name: '🏆 Top 10',
    desc: 'Rank top 10 rows',
    template: (tbl) =>
      `-- Top 10 Records\nSELECT *\nFROM "${tbl}"\nORDER BY 1 DESC\nLIMIT 10;`,
  },
  {
    name: '📐 Aggregates',
    desc: 'Summary metrics (Count, Min, Avg, Max)',
    template: (tbl) =>
      `-- Summary Aggregates\nSELECT \n  COUNT(*) AS total_rows,\n  ROUND(AVG(1), 2) AS sample_avg\nFROM "${tbl}";`,
  },
  {
    name: '✨ Distinct',
    desc: 'List unique categorical values',
    template: (tbl) =>
      `-- Distinct Unique Entities\nSELECT DISTINCT 1 AS unique_entity\nFROM "${tbl}"\nLIMIT 50;`,
  },
  {
    name: '🛡️ Null Audit',
    desc: 'Check for missing or empty data values',
    template: (tbl) =>
      `-- Data Quality & Null Audit\nSELECT \n  COUNT(*) AS total_rows,\n  SUM(CASE WHEN rowid IS NULL THEN 1 ELSE 0 END) AS null_count\nFROM "${tbl}";`,
  },
];

interface SqlEditorProps {
  query: string;
  onChange: (query: string) => void;
  onExecute: () => void;
  onClear: () => void;
  isExecuting?: boolean;
  queryChips?: QueryChip[];
  isSampleMode?: boolean;
  onExitSampleMode?: () => void;
  activeTableName?: string;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  query,
  onChange,
  onExecute,
  onClear,
  isExecuting = false,
  queryChips = [],
  isSampleMode = false,
  onExitSampleMode,
  activeTableName = 'table',
}) => {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Keyboard shortcuts (Ctrl+Enter, Ctrl+L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onExecute();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecute, onClear]);

  const targetTbl = activeTableName || 'table';

  return (
    <div className="border-b border-border bg-surface flex flex-col">
      {/* Editor Toolbar */}
      <div className="h-10 px-3 border-b border-border/80 flex items-center justify-between bg-surface-raised/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">SQL Studio</span>
          <span className="text-[10px] text-slate-600 dark:text-muted font-mono hidden sm:inline">
            (Press <kbd className="px-1 py-0.5 bg-background border border-border rounded text-slate-800 dark:text-slate-300 font-bold">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-background border border-border rounded text-slate-800 dark:text-slate-300 font-bold">Enter</kbd> to run)
          </span>
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 p-0.5 rounded transition-colors"
            title="View Keyboard & Query Shortcuts"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-600 dark:text-muted hover:text-slate-950 dark:hover:text-slate-200 hover:bg-surface-raised transition-all"
            title="Clear Editor (Ctrl + L)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary hover:bg-primary-hover text-white dark:text-slate-950 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Shortcuts Helper Drawer / Tooltip */}
      {showShortcutsHelp && (
        <div className="px-3 py-2 bg-surface-raised border-b border-border text-[11px] text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span><strong className="font-mono text-cyan-800 dark:text-cyan-300">Ctrl + Enter:</strong> Execute SQL</span>
            <span><strong className="font-mono text-cyan-800 dark:text-cyan-300">Ctrl + L:</strong> Clear SQL Editor</span>
            <span><strong className="font-mono text-cyan-800 dark:text-cyan-300">Click Cell:</strong> Copy to Clipboard</span>
            <span><strong className="font-mono text-cyan-800 dark:text-cyan-300">Esc:</strong> Close Modals</span>
          </div>
          <button
            onClick={() => setShowShortcutsHelp(false)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Query Textarea */}
      <div className="p-3">
        <textarea
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter SQL query here (e.g. SELECT * FROM "${targetTbl}" LIMIT 50;)...`}
          rows={5}
          spellCheck={false}
          className="w-full bg-background border border-border rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 placeholder:text-muted focus:outline-none focus:border-primary resize-y leading-relaxed font-medium"
        />
      </div>

      {/* SQL Prompt Templates & Table Query Chips */}
      <div className="px-3 pb-2.5 flex flex-col gap-1.5 text-xs">
        {/* Row 1: SQL Prompt Templates */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-slate-600 dark:text-muted font-medium flex items-center gap-1 flex-shrink-0">
            <Code2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>SQL Prompts:</span>
          </span>
          {SQL_PROMPT_TEMPLATES.map((prompt) => (
            <button
              key={prompt.name}
              onClick={() => onChange(prompt.template(targetTbl))}
              className="px-2 py-0.5 rounded-full bg-surface-raised hover:bg-cyan-500/10 hover:border-primary text-slate-800 dark:text-slate-300 text-[11px] border border-border flex-shrink-0 transition-all font-medium"
              title={prompt.desc}
            >
              {prompt.name}
            </button>
          ))}
        </div>

        {/* Row 2: Table Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {isSampleMode ? (
            <div className="flex items-center gap-1.5 flex-shrink-0 mr-1">
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                <FlaskConical className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Sample Mode
              </span>
              {onExitSampleMode && (
                <button
                  onClick={onExitSampleMode}
                  className="text-[10px] text-muted hover:text-danger hover:underline flex items-center gap-0.5"
                  title="Exit Sample Mode and clear demo tables"
                >
                  <X className="w-2.5 h-2.5" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-600 dark:text-muted font-medium flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>{queryChips.length > 0 ? 'Table Shortcuts:' : 'Shortcuts:'}</span>
            </span>
          )}

          {queryChips.length > 0 ? (
            queryChips.map((item) => (
              <button
                key={item.label}
                onClick={() => onChange(item.query)}
                className="px-2 py-0.5 rounded-full bg-surface-raised hover:bg-border text-slate-800 dark:text-slate-300 text-[11px] border border-border/80 flex-shrink-0 transition-all hover:text-slate-950 dark:hover:text-white font-medium"
              >
                {item.label}
              </button>
            ))
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-muted italic">
              Select or ingest a table to load contextual queries.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
