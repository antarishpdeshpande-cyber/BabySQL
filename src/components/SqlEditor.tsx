import React, { useEffect } from 'react';
import { Play, Eraser, Terminal, Sparkles, FlaskConical, X } from 'lucide-react';
import { QueryChip } from '../lib/sampleData';

interface SqlEditorProps {
  query: string;
  onChange: (query: string) => void;
  onExecute: () => void;
  onClear: () => void;
  isExecuting?: boolean;
  queryChips?: QueryChip[];
  isSampleMode?: boolean;
  onExitSampleMode?: () => void;
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
}) => {
  // Ctrl + Enter shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecute]);

  return (
    <div className="border-b border-border bg-surface flex flex-col">
      {/* Editor Toolbar */}
      <div className="h-10 px-3 border-b border-border/80 flex items-center justify-between bg-surface-raised/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">SQL Studio</span>
          <span className="text-[10px] text-muted font-mono hidden sm:inline">
            (Press <kbd className="px-1 py-0.5 bg-background border border-border rounded text-slate-300">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-background border border-border rounded text-slate-300">Enter</kbd> to run)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-muted hover:text-slate-200 hover:bg-surface-raised transition-all"
            title="Clear Editor"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Query Textarea */}
      <div className="p-3">
        <textarea
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter SQL query here (e.g. SELECT * FROM table LIMIT 50;)..."
          rows={5}
          spellCheck={false}
          className="w-full bg-background border border-border rounded-lg p-3 font-mono text-xs text-slate-200 placeholder:text-muted focus:outline-none focus:border-primary resize-y leading-relaxed"
        />
      </div>

      {/* Contextual / Sample Query Chips */}
      <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto text-xs">
        {isSampleMode ? (
          <div className="flex items-center gap-1.5 flex-shrink-0 mr-1">
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <FlaskConical className="w-3 h-3 text-emerald-400" />
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
          <span className="text-[11px] text-muted flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            {queryChips.length > 0 ? 'Table Shortcuts:' : 'Shortcuts:'}
          </span>
        )}

        {queryChips.length > 0 ? (
          queryChips.map((item) => (
            <button
              key={item.label}
              onClick={() => onChange(item.query)}
              className="px-2 py-0.5 rounded-full bg-surface-raised hover:bg-border text-slate-300 text-[11px] border border-border/80 flex-shrink-0 transition-all hover:text-white"
            >
              {item.label}
            </button>
          ))
        ) : (
          <span className="text-[11px] text-muted italic">
            Ingest a CSV or enable Sample Mode in header to load test queries.
          </span>
        )}
      </div>
    </div>
  );
};
