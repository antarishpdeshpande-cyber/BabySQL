import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  Sigma,
  Hash,
  Percent,
  Layers,
  TrendingUp,
  Info,
  Copy,
  Check,
  Download,
  FileJson,
  BookOpen,
} from 'lucide-react';
import { calculateDescriptiveStats } from '../lib/statsEngine';
import { generateDescriptiveStatsMarkdown, downloadTextFile } from '../lib/reportGenerator';
import { DistributionGraphs } from './DistributionGraphs';

interface StatsDrawerProps {
  columns: string[];
  values: any[][];
  initialColumn?: string;
  tableName?: string;
  onOpenEdaGuide?: () => void;
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({
  columns,
  values,
  initialColumn,
  tableName,
  onOpenEdaGuide,
}) => {
  const [selectedCol, setSelectedCol] = useState<string>(initialColumn || columns[0] || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const colIndex = columns.indexOf(selectedCol);
  const colValues = useMemo(() => {
    if (colIndex === -1 || !values.length) return [];
    return values.map((r) => r[colIndex]);
  }, [colIndex, values]);

  const numericValues = useMemo(() => {
    return colValues
      .map((v) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const cleaned = v.replace(/[$,]/g, '').trim();
          if (cleaned === '') return null;
          const p = Number(cleaned);
          return isNaN(p) ? null : p;
        }
        return null;
      })
      .filter((v): v is number => v !== null && isFinite(v));
  }, [colValues]);

  const stats = useMemo(() => {
    if (!selectedCol || colIndex === -1) return null;
    return calculateDescriptiveStats(selectedCol, colValues);
  }, [selectedCol, colIndex, colValues]);

  const handleCopyReport = () => {
    if (!stats) return;
    const md = generateDescriptiveStatsMarkdown(stats, tableName);
    navigator.clipboard.writeText(md);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!stats) return;
    const md = generateDescriptiveStatsMarkdown(stats, tableName);
    const filename = `${tableName || 'table'}_${selectedCol}_descriptive_stats.md`;
    downloadTextFile(filename, md, 'text/markdown');
  };

  const handleDownloadJson = () => {
    if (!stats) return;
    const jsonStr = JSON.stringify(
      {
        tableName: tableName || null,
        timestamp: new Date().toISOString(),
        stats,
      },
      null,
      2
    );
    const filename = `${tableName || 'table'}_${selectedCol}_descriptive_stats.json`;
    downloadTextFile(filename, jsonStr, 'application/json');
  };

  if (!columns.length || !values.length) {
    return (
      <div className="p-8 text-center text-xs text-muted">
        No active data to analyze. Run a query first to view statistical metrics.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface text-xs font-sans">
      {/* Top Header Controls & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-raised/40 p-3.5 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Statistical Profiler</span>
              <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Descriptive Analysis
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-muted">
              {tableName ? `Table: ${tableName} • ` : ''}Instant mathematical moments &amp; distributions
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onOpenEdaGuide && (
            <button
              onClick={onOpenEdaGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs transition-all cursor-pointer font-medium active:scale-95 shadow-sm"
              title="Open Descriptive Stats & EDA Reference Guide"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>EDA Guide</span>
            </button>
          )}

          {/* Column Selector */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-muted">Column:</span>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="bg-transparent text-xs text-slate-900 dark:text-slate-200 focus:outline-none font-mono font-medium cursor-pointer"
            >
              {columns.map((c) => (
                <option key={c} value={c} className="bg-surface text-slate-900 dark:text-slate-100">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Export Action Buttons */}
          {stats && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-border text-slate-800 dark:text-slate-200 border border-border text-xs transition-all cursor-pointer font-medium active:scale-95 shadow-sm"
                title="Copy formatted descriptive statistical report to clipboard as Markdown"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                )}
                <span>{isCopied ? 'Copied!' : 'Copy Report'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white dark:text-slate-950 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                title="Download full descriptive profiling report as Markdown (.md)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download (.md)</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-surface border border-border hover:bg-surface-raised text-xs text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                title="Download raw descriptive metrics as JSON"
              >
                <FileJson className="w-3 h-3 text-slate-500" />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {stats && (
        <>
          {/* Overview Grid: Counts & Inferred Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Total Count (N)</span>
                <Hash className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {stats.totalCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted mt-1">{stats.validCount.toLocaleString()} valid rows</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Missing / Nulls</span>
                <Percent className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {stats.nullCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted mt-1">{stats.nullPercentage}% of total</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Distinct Values</span>
                <Layers className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-cyan-700 dark:text-cyan-400">
                {stats.uniqueCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted mt-1">Unique entities</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Inferred Type</span>
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {stats.isNumeric ? 'Numeric (Float/Int)' : 'Categorical / Text'}
              </div>
              <div className="text-[10px] text-muted mt-1">Auto-detected</div>
            </div>
          </div>

          {stats.isNumeric ? (
            <div className="space-y-4">
              {/* Central Tendency, Moments & Dispersion */}
              <div className="bg-background border border-border p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sigma className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Central Tendency, Dispersion &amp; Moments</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    Bessel's Correction (n - 1) Applied
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted text-[11px] block">Mean (Arithmetic μ)</span>
                    <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">
                      {stats.mean?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Median (Q2 / 50th %)</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {stats.median?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Sample Std Dev (s)</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {stats.stdDev?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Sample Variance (s²)</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {stats.variance?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted text-[11px] block">Standard Error (SE)</span>
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      {stats.stdError?.toLocaleString() ?? 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Skewness (Fisher g₁)</span>
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      {stats.skewness ?? 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Excess Kurtosis (g₂)</span>
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      {stats.kurtosis ?? 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Aggregate Sum (Σ)</span>
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      {stats.sum?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Five-Number Quartiles */}
                <div className="border-t border-border/50 pt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-muted text-[10px] block uppercase">Minimum</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {stats.min?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] block uppercase">Q1 (25th %)</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {stats.q1?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] block uppercase">Median</span>
                    <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">
                      {stats.median?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] block uppercase">Q3 (75th %)</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {stats.q3?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] block uppercase">Maximum (IQR)</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {stats.max?.toLocaleString()} <span className="text-[10px] text-muted">({stats.iqr})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Frequency Distribution Histogram with Calibrated Intervals and Details */}
              {stats.histogram && stats.histogram.length > 0 && (
                <div className="bg-background border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Frequency Distribution Histogram</span>
                    </h4>
                    <div className="text-[10px] font-mono text-slate-600 dark:text-muted flex flex-wrap items-center gap-2">
                      <span>{stats.histogram.length} Bins</span>
                      <span>•</span>
                      <span>
                        Width:{' '}
                        {(((stats.max ?? 0) - (stats.min ?? 0)) / stats.histogram.length).toFixed(2)}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Mean (μ): {stats.mean}
                      </span>
                      <span>•</span>
                      <span className="text-cyan-800 dark:text-cyan-300 font-semibold">
                        Med: {stats.median}
                      </span>
                    </div>
                  </div>

                  {/* Histogram Bars */}
                  <div className="h-44 flex items-end gap-1.5 pt-8 pb-1 px-2 border-b border-border/70 relative">
                    {stats.histogram.map((bin, i) => {
                      const maxPct = Math.max(...(stats.histogram?.map((b) => b.percentage) || [1]), 1);
                      const heightPct = Math.max(8, Math.round((bin.percentage / maxPct) * 100));
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          {/* Rich Floating Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 bg-surface-raised border border-border text-[10px] font-mono p-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-30 space-y-0.5">
                            <div className="font-bold text-cyan-800 dark:text-cyan-300">
                              Bin {i + 1}: {bin.binLabel}
                            </div>
                            <div className="text-slate-800 dark:text-slate-200">
                              Frequency: {bin.count.toLocaleString()} rows ({bin.percentage}%)
                            </div>
                            <div className="text-slate-600 dark:text-muted">
                              Cumulative: {bin.cumulativePercentage ?? 'N/A'}%
                            </div>
                          </div>

                          {/* Stat Count Badge Above Bar */}
                          <span className="text-[9px] font-mono text-slate-800 dark:text-slate-200 font-semibold mb-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                            {bin.count}
                          </span>

                          {/* Histogram Bar */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-cyan-500/40 hover:bg-cyan-500 dark:bg-cyan-500/30 dark:hover:bg-cyan-400 group-hover:shadow-md group-hover:shadow-cyan-500/30 rounded-t transition-all cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Calibrated X-Axis Bins & Interval Ranges */}
                  <div className="flex items-start gap-1.5 px-2 pt-2 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                    {stats.histogram.map((bin, i) => (
                      <div key={i} className="flex-1 text-center min-w-0" title={bin.binLabel}>
                        <span className="block truncate font-semibold text-[9px] text-slate-900 dark:text-slate-200">
                          {bin.binLabel}
                        </span>
                        <span className="block text-[8px] text-slate-600 dark:text-muted truncate">
                          {bin.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low-Graphic Distribution Graphs: Boxplot & KDE Density Curve with Calibrated X-Axis */}
              {numericValues.length > 2 && (
                <DistributionGraphs values={numericValues} metricName={selectedCol} />
              )}
            </div>
          ) : (
            <div className="bg-background border border-border p-4 rounded-xl shadow-sm">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Top Categories Breakdown
              </h4>
              <div className="space-y-2 font-mono text-xs">
                {stats.topValues?.map((item) => (
                  <div key={item.value} className="space-y-1">
                    <div className="flex justify-between text-slate-800 dark:text-slate-200">
                      <span className="truncate">{item.value || '(empty)'}</span>
                      <span className="text-muted flex-shrink-0">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 dark:bg-cyan-400 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
