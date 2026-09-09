import React, { useState, useMemo } from 'react';
import { BarChart2, Sigma, Hash, Percent, Layers, TrendingUp, Info } from 'lucide-react';
import { calculateDescriptiveStats } from '../lib/statsEngine';
import { DistributionGraphs } from './DistributionGraphs';

interface StatsDrawerProps {
  columns: string[];
  values: any[][];
  initialColumn?: string;
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({ columns, values, initialColumn }) => {
  const [selectedCol, setSelectedCol] = useState<string>(initialColumn || columns[0] || '');

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

  if (!columns.length || !values.length) {
    return (
      <div className="p-8 text-center text-xs text-muted">
        No active data to analyze. Run a query first to view statistical metrics.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface text-xs font-sans">
      <div className="flex items-center justify-between bg-surface-raised/40 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Statistical Profiler</span>
          <span className="text-[11px] text-muted hidden sm:inline">• Automated Descriptive Analysis</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">Select Column:</span>
          <select
            value={selectedCol}
            onChange={(e) => setSelectedCol(e.target.value)}
            className="bg-background border border-border rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary font-mono"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background border border-border p-3 rounded-lg">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Total Count</span>
                <Hash className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-white">{stats.totalCount.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">{stats.validCount.toLocaleString()} valid rows</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Missing / Nulls</span>
                <Percent className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-amber-400">{stats.nullCount.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">{stats.nullPercentage}% of total</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Distinct Values</span>
                <Layers className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-base font-bold font-mono text-cyan-400">{stats.uniqueCount.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">Unique entries</div>
            </div>

            <div className="bg-background border border-border p-3 rounded-lg">
              <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                <span>Inferred Type</span>
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {stats.isNumeric ? 'Numeric (Float/Int)' : 'Categorical / Text'}
              </div>
              <div className="text-[10px] text-muted mt-1">Auto-detected</div>
            </div>
          </div>

          {stats.isNumeric ? (
            <div className="space-y-4">
              <div className="bg-background border border-border p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Sigma className="w-3.5 h-3.5 text-cyan-400" />
                  Central Tendency & Dispersion
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted text-[11px] block">Mean (Average)</span>
                    <span className="text-sm font-semibold text-slate-100">{stats.mean?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Median (50th %)</span>
                    <span className="text-sm font-semibold text-slate-100">{stats.median?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Standard Dev (σ)</span>
                    <span className="text-sm font-semibold text-slate-100">{stats.stdDev?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Sum Total</span>
                    <span className="text-sm font-semibold text-slate-100">{stats.sum?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-border/50 mt-3 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted text-[11px] block">Minimum</span>
                    <span className="text-sm text-slate-200">{stats.min?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Maximum</span>
                    <span className="text-sm text-slate-200">{stats.max?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Q1 (25th %)</span>
                    <span className="text-sm text-slate-200">{stats.q1?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Q3 (75th %) / IQR</span>
                    <span className="text-sm text-slate-200">
                      {stats.q3?.toLocaleString()} <span className="text-[10px] text-muted">({stats.iqr})</span>
                    </span>
                  </div>
                </div>
              </div>

              {stats.histogram && stats.histogram.length > 0 && (
                <div className="bg-background border border-border p-4 rounded-lg">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Frequency Distribution Histogram
                  </h4>
                  <div className="h-40 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-border/50">
                    {stats.histogram.map((bin, i) => {
                      const maxPct = Math.max(...(stats.histogram?.map((b) => b.percentage) || [1]), 1);
                      const heightPct = Math.max(6, Math.round((bin.percentage / maxPct) * 100));
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface-raised border border-border text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                            {bin.count} rows ({bin.percentage}%)
                          </div>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-cyan-500/40 hover:bg-cyan-400 group-hover:shadow-sm group-hover:shadow-cyan-500/50 rounded-t transition-all"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted pt-1">
                    <span>Min: {stats.min}</span>
                    <span>Histogram Bins (Frequency spread)</span>
                    <span>Max: {stats.max}</span>
                  </div>
                </div>
              )}

              {/* Low-Graphic Distribution Graphs: Boxplot & KDE Density Curve */}
              {numericValues.length > 2 && (
                <DistributionGraphs values={numericValues} metricName={selectedCol} />
              )}
            </div>
          ) : (
            <div className="bg-background border border-border p-4 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                Top Categories Breakdown
              </h4>
              <div className="space-y-2 font-mono text-xs">
                {stats.topValues?.map((item) => (
                  <div key={item.value} className="space-y-1">
                    <div className="flex justify-between text-slate-200">
                      <span className="truncate">{item.value || '(empty)'}</span>
                      <span className="text-muted flex-shrink-0">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className="h-full bg-emerald-400/70 rounded-full"
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
