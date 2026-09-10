import React, { useState, useEffect, useMemo } from 'react';
import { TableMeta } from '../types';
import {
  generateSampleTable,
  generateDistributionSampleTable,
  getStratifiedBreakdown,
  SamplingConfig,
  DistributionSamplingConfig,
  StratumAllocationInfo,
} from '../lib/samplingEngine';
import {
  Dice5,
  X,
  Sliders,
  Layers,
  Percent,
  Hash,
  Info,
  TrendingUp,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Table,
  BookOpen,
} from 'lucide-react';

interface SamplingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableMeta[];
  defaultTable?: string;
  onSampleCreated: (newTableName: string, count: number) => void;
  onOpenSamplingGuide?: () => void;
}

export const SamplingModal: React.FC<SamplingModalProps> = ({
  isOpen,
  onClose,
  tables,
  defaultTable,
  onSampleCreated,
  onOpenSamplingGuide,
}) => {
  const [tabMode, setTabMode] = useState<'resample' | 'simulate'>('resample');

  // Resample state
  const [sourceTable, setSourceTable] = useState<string>(defaultTable || tables[0]?.name || '');
  const [method, setMethod] = useState<SamplingConfig['method']>('random_count');
  const [count, setCount] = useState<number>(50);
  const [percentage, setPercentage] = useState<number>(20);
  const [stratifyColumn, setStratifyColumn] = useState<string>('');
  const [stratifiedAllocation, setStratifiedAllocation] = useState<'proportional' | 'equal'>('proportional');
  const [stratifiedSizeMode, setStratifiedSizeMode] = useState<'count' | 'pct'>('count');
  const [stratifiedTotalCount, setStratifiedTotalCount] = useState<number>(100);
  const [stratifiedPercentage, setStratifiedPercentage] = useState<number>(20);
  const [countPerStratum, setCountPerStratum] = useState<number>(15);
  const [stepK, setStepK] = useState<number>(5);
  const [targetTable, setTargetTable] = useState<string>('');

  // Simulation state (jStat distributions)
  const [distType, setDistType] = useState<DistributionSamplingConfig['distribution']>('normal');
  const [distN, setDistN] = useState<number>(1000);
  const [param1, setParam1] = useState<number>(100); // mean / min / df
  const [param2, setParam2] = useState<number>(15); // stdDev / max
  const [simTargetTable, setSimTargetTable] = useState<string>('sim_normal_1000');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTable && tables.some((t) => t.name === defaultTable)) {
      setSourceTable(defaultTable);
    } else if (tables.length > 0 && !sourceTable) {
      setSourceTable(tables[0].name);
    }
  }, [defaultTable, tables]);

  useEffect(() => {
    if (sourceTable) {
      setTargetTable(`${sourceTable}_sample`);
      const meta = tables.find((t) => t.name === sourceTable);
      if (meta && meta.columns.length > 0) {
        setStratifyColumn(meta.columns[0].name);
      }
    }
  }, [sourceTable, tables]);

  useEffect(() => {
    setSimTargetTable(`sim_${distType}_${distN}`);
  }, [distType, distN]);

  // Compute live stratum allocation breakdown preview
  const stratumBreakdown = useMemo(() => {
    if (!isOpen || method !== 'stratified' || !sourceTable || !stratifyColumn) {
      return [];
    }
    const target = stratifiedAllocation === 'proportional'
      ? (stratifiedSizeMode === 'count' ? stratifiedTotalCount : stratifiedPercentage)
      : countPerStratum;
    const isPct = stratifiedAllocation === 'proportional' && stratifiedSizeMode === 'pct';
    return getStratifiedBreakdown(sourceTable, stratifyColumn, stratifiedAllocation, target, isPct);
  }, [
    isOpen,
    method,
    sourceTable,
    stratifyColumn,
    stratifiedAllocation,
    stratifiedSizeMode,
    stratifiedTotalCount,
    stratifiedPercentage,
    countPerStratum,
  ]);

  if (!isOpen) return null;

  const currentMeta = tables.find((t) => t.name === sourceTable);
  const columns = currentMeta ? currentMeta.columns.map((c) => c.name) : [];

  const handleGenerate = () => {
    setError(null);
    try {
      if (tabMode === 'resample') {
        if (!sourceTable) {
          throw new Error('Please select a source table.');
        }
        const res = generateSampleTable({
          sourceTable,
          targetTable,
          method,
          count,
          percentage,
          stratifyColumn,
          stratifiedAllocation,
          stratifiedTotalCount: stratifiedSizeMode === 'count' ? stratifiedTotalCount : undefined,
          stratifiedPercentage: stratifiedSizeMode === 'pct' ? stratifiedPercentage : undefined,
          countPerStratum,
          stepK,
        });
        onSampleCreated(res.tableName, res.rowCount);
      } else {
        const res = generateDistributionSampleTable({
          targetTable: simTargetTable,
          distribution: distType,
          sampleSize: distN,
          param1,
          param2,
        });
        onSampleCreated(res.tableName, res.rowCount);
      }
      onClose();
    } catch (err: any) {
      console.error('Sampling error:', err);
      setError(err.message || 'Sampling generation failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-cyan-400">
              <Dice5 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Dataset Sampling & Simulation</h3>
              <p className="text-[11px] text-muted">Fisher-Yates shuffle algorithms & jStat distribution generators</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenSamplingGuide && (
              <button
                type="button"
                onClick={onOpenSamplingGuide}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer mr-1 font-medium"
                title="Open Sampling & Simulation Reference Guide"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sampling Guide</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-muted hover:text-slate-200 hover:bg-surface-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-border bg-surface text-xs font-medium">
          <button
            onClick={() => setTabMode('resample')}
            className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              tabMode === 'resample'
                ? 'border-primary text-cyan-400 bg-surface-raised/40 font-semibold'
                : 'border-transparent text-muted hover:text-slate-300'
            }`}
          >
            <Dice5 className="w-3.5 h-3.5" />
            <span>Resample Existing Table</span>
          </button>

          <button
            onClick={() => setTabMode('simulate')}
            className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              tabMode === 'simulate'
                ? 'border-primary text-cyan-400 bg-surface-raised/40 font-semibold'
                : 'border-transparent text-muted hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Distribution (jStat)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          {tabMode === 'resample' ? (
            <>
              {/* Source Table */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Source Table to Sample</label>
                <select
                  value={sourceTable}
                  onChange={(e) => setSourceTable(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.rowCount} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sampling Method Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-slate-400">Sampling Algorithm</label>
                  <span className="text-[10px] text-cyan-400 font-mono">Fisher-Yates O(N) Unbiased</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('random_count')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      method === 'random_count'
                        ? 'bg-primary/20 border-primary text-cyan-300'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                      <Hash className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Random N Rows</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">Fisher-Yates shuffle sample</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('random_pct')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      method === 'random_pct'
                        ? 'bg-primary/20 border-primary text-cyan-300'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                      <Percent className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Percentage (%)</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">Fixed % of all records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('stratified')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      method === 'stratified'
                        ? 'bg-primary/20 border-primary text-cyan-300'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Stratified</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">Balanced sample per category</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('systematic')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      method === 'systematic'
                        ? 'bg-primary/20 border-primary text-cyan-300'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Systematic</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">Every k-th record in sequence</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('bootstrap')}
                    className={`p-2.5 rounded border text-left transition-all col-span-2 ${
                      method === 'bootstrap'
                        ? 'bg-primary/20 border-primary text-cyan-300'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                      <Dice5 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Bootstrap Resampling (With Replacement)</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">Draw with replacement to estimate confidence bounds</div>
                  </button>
                </div>
              </div>

              {/* Dynamic Parameters */}
              <div className="p-3 rounded-lg bg-background border border-border/80 space-y-3">
                {(method === 'random_count' || method === 'bootstrap') && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      {method === 'bootstrap' ? 'Resample Size (draws with replacement)' : 'Sample Size (Number of Rows)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentMeta?.rowCount || 100000}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {method === 'random_pct' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-medium text-slate-300">Sampling Percentage</label>
                      <span className="text-cyan-400 font-mono font-semibold">{percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={percentage}
                      onChange={(e) => setPercentage(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                )}

                {method === 'stratified' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Stratify By Categorical Column
                      </label>
                      <select
                        value={stratifyColumn}
                        onChange={(e) => setStratifyColumn(e.target.value)}
                        className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                      >
                        {columns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Allocation Mode Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-medium text-slate-300">
                          Stratum Allocation Strategy
                        </label>
                        {onOpenSamplingGuide && (
                          <button
                            type="button"
                            onClick={onOpenSamplingGuide}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer hover:underline font-mono"
                          >
                            <Info className="w-3 h-3" />
                            <span>Proportional Math Guide</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStratifiedAllocation('proportional')}
                          className={`p-2 rounded border text-left transition-all ${
                            stratifiedAllocation === 'proportional'
                              ? 'bg-primary/20 border-primary text-cyan-300'
                              : 'bg-surface border-border text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                            <span>Proportional</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                              Population Ratio
                            </span>
                          </div>
                          <div className="text-[10px] text-muted mt-0.5">
                            Sample mirrors exact population weights (wₕ = Nₕ / N)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStratifiedAllocation('equal')}
                          className={`p-2 rounded border text-left transition-all ${
                            stratifiedAllocation === 'equal'
                              ? 'bg-primary/20 border-primary text-cyan-300'
                              : 'bg-surface border-border text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-xs text-slate-200">Equal Rows</div>
                          <div className="text-[10px] text-muted mt-0.5">
                            Fixed count per group regardless of size
                          </div>
                        </button>
                      </div>
                    </div>

                    {stratifiedAllocation === 'proportional' ? (
                      <div className="space-y-2 bg-surface/60 p-2.5 rounded border border-border/70">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-300">
                            Target Total Sample Size
                          </label>
                          <div className="flex items-center gap-1 bg-background p-0.5 rounded border border-border text-[10px]">
                            <button
                              type="button"
                              onClick={() => setStratifiedSizeMode('count')}
                              className={`px-2 py-0.5 rounded transition-colors ${
                                stratifiedSizeMode === 'count'
                                  ? 'bg-primary/20 text-cyan-300 font-medium'
                                  : 'text-muted hover:text-slate-200'
                              }`}
                            >
                              Fixed N
                            </button>
                            <button
                              type="button"
                              onClick={() => setStratifiedSizeMode('pct')}
                              className={`px-2 py-0.5 rounded transition-colors ${
                                stratifiedSizeMode === 'pct'
                                  ? 'bg-primary/20 text-cyan-300 font-medium'
                                  : 'text-muted hover:text-slate-200'
                              }`}
                            >
                              % of Pop
                            </button>
                          </div>
                        </div>

                        {stratifiedSizeMode === 'count' ? (
                          <input
                            type="number"
                            min={1}
                            max={currentMeta?.rowCount || 100000}
                            value={stratifiedTotalCount}
                            onChange={(e) => setStratifiedTotalCount(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-muted">Percentage of dataset:</span>
                              <span className="font-mono text-cyan-400 font-bold">{stratifiedPercentage}%</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={99}
                              value={stratifiedPercentage}
                              onChange={(e) => setStratifiedPercentage(Number(e.target.value))}
                              className="w-full accent-cyan-400 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Target Samples Per Group
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={countPerStratum}
                          onChange={(e) => setCountPerStratum(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    {/* Live Stratum Allocation Preview Breakdown */}
                    {stratumBreakdown.length > 0 && (
                      <div className="mt-2 border border-border/80 rounded-lg overflow-hidden bg-background">
                        <div className="px-2.5 py-1.5 bg-surface-raised/60 border-b border-border/80 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-300 flex items-center gap-1.5">
                            <Table className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Stratum Allocation Breakdown</span>
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            Total: {stratumBreakdown.reduce((a, b) => a + b.sampleSize, 0)} / {currentMeta?.rowCount || 0} rows
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto">
                          <table className="w-full text-left text-[10px]">
                            <thead className="bg-surface/50 text-slate-400 sticky top-0 border-b border-border/50">
                              <tr>
                                <th className="py-1 px-2.5 font-medium">Stratum</th>
                                <th className="py-1 px-2 text-right font-medium">Pop (Nₕ)</th>
                                <th className="py-1 px-2 text-right font-medium">Pop %</th>
                                <th className="py-1 px-2 text-right font-medium">Sample (nₕ)</th>
                                <th className="py-1 px-2.5 text-right font-medium">Sample %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-mono">
                              {stratumBreakdown.map((row) => (
                                <tr key={row.stratum} className="hover:bg-surface-raised/30 transition-colors">
                                  <td className="py-1 px-2.5 text-slate-200 font-sans truncate max-w-[120px]" title={row.stratum}>
                                    {row.stratum}
                                  </td>
                                  <td className="py-1 px-2 text-right text-slate-400">{row.populationSize}</td>
                                  <td className="py-1 px-2 text-right text-slate-400">
                                    {(row.populationShare * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-1 px-2 text-right text-cyan-400 font-bold">{row.sampleSize}</td>
                                  <td className="py-1 px-2.5 text-right text-cyan-300 font-semibold">
                                    {(row.sampleShare * 100).toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-2.5 py-1 bg-surface-raised/20 border-t border-border/50 text-[9.5px] text-muted flex items-center justify-between">
                          <span>
                            {stratifiedAllocation === 'proportional'
                              ? 'Hamilton largest-remainder quota method ensures exact population proportionality.'
                              : 'Equal allocation guarantees identical representation per group.'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {method === 'systematic' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Interval Step (k)</label>
                    <input
                      type="number"
                      min={2}
                      value={stepK}
                      onChange={(e) => setStepK(Math.max(2, Number(e.target.value)))}
                      className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Destination Table */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">New Sample Table Name</label>
                <input
                  type="text"
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-primary"
                />
              </div>
            </>
          ) : (
            <>
              {/* Synthetic Simulation Mode (jStat Distributions) */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Probability Distribution</label>
                <select
                  value={distType}
                  onChange={(e) => setDistType(e.target.value as any)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="normal">Normal (Gaussian) - Bell Curve: (μ, σ)</option>
                  <option value="uniform">Uniform - Flat Probability: (min, max)</option>
                  <option value="studentt">Student's t - Heavy Tails: (df)</option>
                  <option value="chisquare">Chi-Square (χ²) - Positive Skew: (df)</option>
                  <option value="gamma">Gamma - Waiting Time / Rates: (shape k, scale θ)</option>
                  <option value="beta">Beta - Bounded Proportions: (α, β)</option>
                  <option value="exponential">Exponential - Inter-Arrival Time: (rate λ)</option>
                </select>
              </div>

              {/* Distribution Parameters */}
              <div className="p-3.5 rounded-lg bg-background border border-border/80 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      {distType === 'normal'
                        ? 'Mean (μ)'
                        : distType === 'uniform'
                        ? 'Minimum (a)'
                        : distType === 'studentt' || distType === 'chisquare'
                        ? 'Degrees of Freedom'
                        : distType === 'gamma'
                        ? 'Shape (k)'
                        : distType === 'beta'
                        ? 'Alpha (α)'
                        : 'Rate (λ)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={param1}
                      onChange={(e) => setParam1(Number(e.target.value))}
                      className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {(distType === 'normal' || distType === 'uniform' || distType === 'gamma' || distType === 'beta') && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        {distType === 'normal'
                          ? 'Std Dev (σ)'
                          : distType === 'uniform'
                          ? 'Maximum (b)'
                          : distType === 'gamma'
                          ? 'Scale (θ)'
                          : 'Beta (β)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={param2}
                        onChange={(e) => setParam2(Number(e.target.value))}
                        className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Sample Draws (N Data Points)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={25000}
                    value={distN}
                    onChange={(e) => setDistN(Math.max(10, Number(e.target.value)))}
                    className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Destination Table */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">New Simulated Table Name</label>
                <input
                  type="text"
                  value={simTargetTable}
                  onChange={(e) => setSimTargetTable(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-primary"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised/20 flex items-center justify-between">
          <div className="text-[10px] text-muted flex items-center gap-1">
            <Info className="w-3 h-3 text-cyan-400" />
            <span>Saved as a queryable SQLite table in &lt; 5ms</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border hover:bg-surface-raised text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary-hover active:scale-[0.98] text-slate-900 font-semibold text-xs flex items-center gap-1.5 shadow"
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>{tabMode === 'resample' ? 'Generate Sample Table' : 'Simulate & Create Table'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
