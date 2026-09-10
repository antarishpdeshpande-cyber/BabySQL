import React, { useRef } from 'react';
import { Database, Upload, Download, FolderOpen, RefreshCw, FlaskConical, Dice5, BookOpen, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onOpenUploader: () => void;
  onExportDb: () => void;
  onImportDb: (file: File) => void;
  onToggleSampleMode: () => void;
  isSampleMode: boolean;
  onResetDb: () => void;
  isReady: boolean;
  tableCount: number;
  onOpenSampling?: () => void;
  onOpenGuide?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploader,
  onExportDb,
  onImportDb,
  onToggleSampleMode,
  isSampleMode,
  onResetDb,
  isReady,
  tableCount,
  onOpenSampling,
  onOpenGuide,
  theme,
  onToggleTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportDb(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur px-4 flex items-center justify-between select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-primary shadow-sm shadow-cyan-500/10">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">BabySQL</span>
            <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
              Enterprise Hypothesis Testing Platform
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-raised text-muted border border-border">
              v1.0 • Local
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`inline-block w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isReady ? `SQLite 3 Engine Ready (${tableCount} ${tableCount === 1 ? 'table' : 'tables'})` : 'Initializing SQLite...'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenUploader}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white dark:text-slate-950 font-medium text-xs shadow-sm transition-all active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Ingest CSV</span>
        </button>

        <button
          onClick={onToggleSampleMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${
            isSampleMode
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 font-medium'
              : 'bg-surface-raised hover:bg-border text-slate-700 dark:text-slate-200 border-border'
          }`}
          title={isSampleMode ? 'Exit Sample Mode' : 'Enter Sample Mode to explore demo datasets'}
        >
          <FlaskConical className={`w-3.5 h-3.5 ${isSampleMode ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
          <span>{isSampleMode ? 'Sample Mode (Active)' : 'Sample Mode'}</span>
        </button>

        {onOpenSampling && (
          <button
            onClick={onOpenSampling}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-border text-slate-700 dark:text-slate-200 text-xs border border-border transition-all"
            title="Create a sample of an existing table or simulate theoretical distributions"
          >
            <Dice5 className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Sample / Simulate</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-border text-slate-700 dark:text-slate-200 text-xs border border-border transition-all"
            title="Statistical Decision Framework & When-to-Use Reference Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Stats Guide</span>
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".db,.sqlite,.sqlite3"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-surface-raised text-slate-600 dark:text-slate-300 text-xs border border-transparent hover:border-border transition-all"
          title="Open .sqlite or .db file from your local disk"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Open .db</span>
        </button>

        <button
          onClick={onExportDb}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-surface-raised text-slate-600 dark:text-slate-300 text-xs border border-transparent hover:border-border transition-all"
          title="Save and download the full SQLite database file to disk"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export .db</span>
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Minimalist Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md hover:bg-surface-raised text-muted hover:text-slate-800 dark:hover:text-slate-200 transition-all border border-transparent hover:border-border"
          title={theme === 'dark' ? 'Switch to Minimalist Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-600" />
          )}
        </button>

        <button
          onClick={onResetDb}
          className="p-1.5 rounded-md hover:bg-danger/10 hover:text-danger text-muted transition-all"
          title="Clear all tables and reset database"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
