import React, { useState, useMemo, useEffect } from 'react';
import {
  HypothesisTestType,
  TestConfig,
  HypothesisTestResult,
} from '../types/hypothesis';
import { executeHypothesisTest } from '../lib/hypothesisEngine';
import { TableMeta } from '../types';
import { executeQuery } from '../lib/sqliteEngine';
import { StatisticalGuideModal } from './StatisticalGuideModal';
import { SamplingModal } from './SamplingModal';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Sliders,
  BarChart2,
  Table as TableIcon,
  ChevronRight,
  Info,
  BookOpen,
  Dice5,
} from 'lucide-react';

interface HypothesisStudioProps {
  tables: TableMeta[];
  activeTableName: string;
  onSampleCreated?: (tableName: string, count: number) => void;
}

interface TestDescriptor {
  type: HypothesisTestType;
  title: string;
  category: 'Means' | 'Categorical' | 'Predictive' | 'Non-Parametric';
  shortDesc: string;
  badge: string;
}

const TEST_OPTIONS: TestDescriptor[] = [
  {
    type: 'welch_ttest',
    title: "Two-Sample Welch's t-Test",
    category: 'Means',
    shortDesc: 'A/B testing: Compare means of two independent cohorts (e.g. Variant A vs B)',
    badge: 'A/B Test',
  },
  {
    type: 'one_sample_ttest',
    title: 'One-Sample t-Test',
    category: 'Means',
    shortDesc: 'Test if a numeric metric statistically differs from a baseline KPI benchmark',
    badge: 'Benchmark',
  },
  {
    type: 'paired_ttest',
    title: 'Paired Samples t-Test',
    category: 'Means',
    shortDesc: 'Compare repeated measures or before-and-after metrics for the same subjects',
    badge: 'Before / After',
  },
  {
    type: 'one_way_anova',
    title: 'One-Way ANOVA (F-Test)',
    category: 'Means',
    shortDesc: 'Compare metric variation across 3 or more categorical segments or departments',
    badge: 'Multi-Group',
  },
  {
    type: 'chi_square',
    title: 'Chi-Square Independence (χ²)',
    category: 'Categorical',
    shortDesc: 'Test whether two categorical attributes are statistically associated or independent',
    badge: 'Categorical',
  },
  {
    type: 'correlation',
    title: 'Pearson Correlation Test',
    category: 'Predictive',
    shortDesc: 'Evaluate the direction and linear relationship strength between two metrics',
    badge: 'Correlation',
  },
  {
    type: 'linear_regression',
    title: 'OLS Linear Regression',
    category: 'Predictive',
    shortDesc: 'Quantify impact and predict outcome Y from independent predictor X',
    badge: 'Prediction',
  },
  {
    type: 'mann_whitney',
    title: 'Mann-Whitney U Test',
    category: 'Non-Parametric',
    shortDesc: 'Compare rank distributions between two groups when data is skewed or non-normal',
    badge: 'Skewed / Non-Normal',
  },
];

export const HypothesisStudio: React.FC<HypothesisStudioProps> = ({
  tables,
  activeTableName,
  onSampleCreated,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>(activeTableName || (tables[0]?.name ?? ''));
  const [testType, setTestType] = useState<HypothesisTestType>('welch_ttest');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [groupColumn, setGroupColumn] = useState<string>('');
  const [secondaryColumn, setSecondaryColumn] = useState<string>('');
  const [benchmarkValue, setBenchmarkValue] = useState<number>(100);
  const [alpha, setAlpha] = useState<number>(0.05);
  const [result, setResult] = useState<HypothesisTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSamplingOpen, setIsSamplingOpen] = useState<boolean>(false);

  // Sync selected table if activeTableName changes
  useEffect(() => {
    if (activeTableName && activeTableName !== selectedTable) {
      setSelectedTable(activeTableName);
    }
  }, [activeTableName]);

  // Read columns of current selected table
  const currentTableMeta = useMemo(() => {
    return tables.find((t) => t.name === selectedTable);
  }, [tables, selectedTable]);

  const columns = useMemo(() => {
    return currentTableMeta ? currentTableMeta.columns.map((c) => c.name) : [];
  }, [currentTableMeta]);

  // Categorize columns into numeric and text/categorical
  const { numericColumns, categoricalColumns } = useMemo(() => {
    if (!currentTableMeta) return { numericColumns: [], categoricalColumns: [] };
    const num: string[] = [];
    const cat: string[] = [];
    currentTableMeta.columns.forEach((c) => {
      const type = c.type.toUpperCase();
      if (type.includes('INT') || type.includes('REAL') || type.includes('NUM') || type.includes('FLOAT') || type.includes('DOUBLE')) {
        num.push(c.name);
      } else {
        cat.push(c.name);
      }
    });
    return { numericColumns: num.length > 0 ? num : columns, categoricalColumns: cat.length > 0 ? cat : columns };
  }, [currentTableMeta, columns]);

  // Set default column selections when table or test changes
  useEffect(() => {
    if (columns.length > 0) {
      if (!targetColumn || !columns.includes(targetColumn)) {
        setTargetColumn(numericColumns[0] || columns[0]);
      }
      if (!groupColumn || !columns.includes(groupColumn)) {
        setGroupColumn(categoricalColumns[0] || columns[0]);
      }
      if (!secondaryColumn || !columns.includes(secondaryColumn)) {
        const remainingNum = numericColumns.filter((c) => c !== targetColumn);
        setSecondaryColumn(remainingNum[0] || columns[1] || columns[0]);
      }
    }
  }, [selectedTable, testType, columns, numericColumns, categoricalColumns]);

  // Execute the test
  const handleRunTest = () => {
    setError(null);
    try {
      if (!selectedTable) {
        throw new Error('Please select a table to analyze.');
      }
      // Query raw table data from SQLite
      const queryRes = executeQuery(`SELECT * FROM "${selectedTable}";`);
      if (!queryRes.values || queryRes.values.length === 0) {
        throw new Error(`Table "${selectedTable}" is empty.`);
      }

      const config: TestConfig = {
        testType,
        tableName: selectedTable,
        targetColumn,
        groupColumn,
        secondaryColumn,
        benchmarkValue,
        alpha,
        alternative: 'two-sided',
      };

      const testRes = executeHypothesisTest(config, queryRes.columns, queryRes.values);
      setResult(testRes);
    } catch (err: any) {
      console.error('Hypothesis Test error:', err);
      setError(err.message || 'Failed to execute hypothesis test.');
      setResult(null);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const text = `=== ${result.testName} ===
Table: ${result.tableName} | Sample Size: ${result.sampleSize} | α: ${result.alpha}
Verdict: ${result.executiveSummary.headline}
H₀: ${result.executiveSummary.h0}
Hₐ: ${result.executiveSummary.ha}
Test Statistic (${result.statisticName}): ${result.testStatistic} | p-value: ${result.pVal}
Takeaway: ${result.executiveSummary.takeaway}
${result.executiveSummary.effectSizeLabel || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (tables.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-border flex items-center justify-center mb-4 text-cyan-400">
          <FlaskConical className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">No Data Available for Hypothesis Testing</h2>
        <p className="text-xs text-muted max-w-md mb-4">
          Ingest a CSV file or enable <strong>Sample Mode</strong> from the top bar to run A/B tests, ANOVA, Chi-Square, and regression models.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left Control Panel: Test Configuration */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border bg-surface-raised/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Hypothesis Testing
              </h2>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Rigorous business models &amp; statistical inference
            </p>
          </div>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-border hover:bg-surface-raised text-[11px] text-cyan-300 transition-all cursor-pointer shadow-sm"
            title="Open Statistical Decision Tree & Reference Guide"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span>Guide</span>
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Table Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-400">Data Source Table</label>
              <button
                type="button"
                onClick={() => setIsSamplingOpen(true)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                title="Create a sample of this table using Fisher-Yates shuffle"
              >
                <Dice5 className="w-3 h-3" />
                <span>Sample Data</span>
              </button>
            </div>
            <div className="relative">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary cursor-pointer"
              >
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Test Type Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Statistical Test / Model</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as HypothesisTestType)}
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <optgroup label="Comparing Means">
                <option value="welch_ttest">Two-Sample Welch's t-Test (A/B Test)</option>
                <option value="one_sample_ttest">One-Sample t-Test (Benchmark)</option>
                <option value="paired_ttest">Paired Samples t-Test (Before / After)</option>
                <option value="one_way_anova">One-Way ANOVA (3+ Groups)</option>
              </optgroup>
              <optgroup label="Categorical Association">
                <option value="chi_square">Chi-Square Independence Test (χ²)</option>
              </optgroup>
              <optgroup label="Relationships & Prediction">
                <option value="correlation">Pearson Correlation Test</option>
                <option value="linear_regression">OLS Linear Regression Model</option>
              </optgroup>
              <optgroup label="Non-Parametric">
                <option value="mann_whitney">Mann-Whitney U Test (Skewed Data)</option>
              </optgroup>
            </select>
          </div>

          {/* Test Description Card */}
          {(() => {
            const desc = TEST_OPTIONS.find((t) => t.type === testType);
            return (
              <div className="p-2.5 rounded bg-background/60 border border-border/80 text-[11px] text-slate-300 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">{desc?.badge}: </span>
                  {desc?.shortDesc}
                </div>
              </div>
            );
          })()}

          {/* Dynamic Inputs Based on Test Type */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            {/* Target / Dependent Column */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {testType === 'chi_square'
                  ? 'First Categorical Variable (Rows)'
                  : testType === 'linear_regression'
                  ? 'Dependent Outcome Variable (Y)'
                  : 'Metric / Target Column (Continuous)'}
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Grouping Column for 2-sample t-test, ANOVA, Mann-Whitney, Chi-Square */}
            {(testType === 'welch_ttest' ||
              testType === 'one_way_anova' ||
              testType === 'mann_whitney' ||
              testType === 'chi_square') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'chi_square'
                    ? 'Second Categorical Variable (Columns)'
                    : 'Grouping / Segment Column (Categories)'}
                </label>
                <select
                  value={groupColumn}
                  onChange={(e) => setGroupColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Secondary Column for Paired t-test, Correlation, Linear Regression */}
            {(testType === 'paired_ttest' ||
              testType === 'correlation' ||
              testType === 'linear_regression') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'linear_regression'
                    ? 'Independent Predictor Column (X)'
                    : testType === 'paired_ttest'
                    ? 'Comparison / "After" Column'
                    : 'Second Numeric Column'}
                </label>
                <select
                  value={secondaryColumn}
                  onChange={(e) => setSecondaryColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Benchmark Input for One-Sample t-test */}
            {testType === 'one_sample_ttest' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Target Benchmark Value (μ₀)
                </label>
                <input
                  type="number"
                  value={benchmarkValue}
                  onChange={(e) => setBenchmarkValue(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                  placeholder="e.g. 100"
                />
              </div>
            )}

            {/* Significance Level Alpha */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Significance Level (α)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { val: 0.05, label: '5% (0.05)', desc: '95% CI' },
                  { val: 0.01, label: '1% (0.01)', desc: '99% CI' },
                  { val: 0.1, label: '10% (0.10)', desc: '90% CI' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setAlpha(item.val)}
                    className={`py-1.5 px-2 rounded border text-center transition-all ${
                      alpha === item.val
                        ? 'bg-primary/20 border-primary text-cyan-300 font-semibold shadow-sm'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">{item.label}</div>
                    <div className="text-[9px] text-muted">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRunTest}
            className="w-full mt-2 py-2 px-3 rounded bg-primary hover:bg-primary-hover active:scale-[0.98] text-slate-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Run Statistical Test</span>
          </button>
        </div>
      </div>

      {/* Right Content Pane: Test Results & Executive Deck */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 lg:p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!result && !error && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
            <Sliders className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Select Variables & Run Test</h3>
            <p className="text-xs max-w-md">
              Choose your hypotheses parameters from the left panel and click <strong>Run Statistical Test</strong>. The engine will evaluate the data in under 2ms.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Verdict Card */}
            <div
              className={`p-4 lg:p-5 rounded-xl border shadow-lg transition-all ${
                result.executiveSummary.verdict === 'significant'
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-amber-950/20 border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  {result.executiveSummary.verdict === 'significant' ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3
                      className={`text-base font-bold ${
                        result.executiveSummary.verdict === 'significant'
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {result.executiveSummary.headline}
                    </h3>
                    <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                      <span>{result.testName}</span>
                      <span>•</span>
                      <span>N = {result.sampleSize}</span>
                      <span>•</span>
                      <span>α = {result.alpha}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopySummary}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-border hover:bg-surface-raised text-xs text-slate-300 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>

              {/* Plain-English Executive Narrative */}
              <div className="mt-3.5 p-3 rounded-lg bg-background/80 border border-white/5">
                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Executive Business Takeaway</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {result.executiveSummary.takeaway}
                </p>
                {result.executiveSummary.effectSizeLabel && (
                  <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block">
                    {result.executiveSummary.effectSizeLabel}
                  </div>
                )}
              </div>

              {/* Hypotheses Definition */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-surface/60 border border-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Null Hypothesis</span>
                  <span className="text-slate-300 font-mono text-[11px]">{result.executiveSummary.h0}</span>
                </div>
                <div className="p-2.5 rounded bg-surface/60 border border-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Alternative Hypothesis</span>
                  <span className="text-slate-300 font-mono text-[11px]">{result.executiveSummary.ha}</span>
                </div>
              </div>
            </div>

            {/* Statistical Metrics Grid */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
                <span>Test Metrics & Parameters</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {result.metrics.map((metric, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between">
                    <span className="text-[10px] text-muted uppercase font-medium">{metric.name}</span>
                    <span className="text-base font-bold font-mono text-slate-100 mt-1 truncate" title={String(metric.value)}>
                      {metric.value}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 truncate" title={metric.description}>
                      {metric.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Charts: Group Comparisons (t-test / ANOVA) */}
            {result.groupSummaries && result.groupSummaries.length > 0 && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    <span>Group Means & {Math.round((1 - result.alpha) * 100)}% Confidence Intervals</span>
                  </span>
                  <span className="text-[11px] font-normal text-muted">
                    Error bars denote {Math.round((1 - result.alpha) * 100)}% CI
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.groupSummaries.map((grp) => {
                    return (
                      <div key={grp.group} className="p-3.5 rounded-lg bg-background border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-200">{grp.group}</span>
                          <span className="text-[10px] font-mono text-muted">n = {grp.count}</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-cyan-400">
                          {grp.mean}
                        </div>
                        <div className="mt-2 text-[10px] space-y-0.5 text-slate-400 font-mono">
                          <div className="flex justify-between">
                            <span>Std Dev:</span>
                            <span>{grp.stdDev}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Std Error:</span>
                            <span>{grp.stdError}</span>
                          </div>
                          {grp.ciLower !== 0 && (
                            <div className="flex justify-between text-slate-300">
                              <span>{Math.round((1 - result.alpha) * 100)}% CI:</span>
                              <span>[{grp.ciLower}, {grp.ciUpper}]</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regression Model Coefficients Table */}
            {result.regressionCoefficients && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-primary" />
                  <span>OLS Model Parameter Estimates</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Predictor</th>
                        <th className="px-3 py-2 font-medium">Coefficient (β)</th>
                        <th className="px-3 py-2 font-medium">Std Error</th>
                        <th className="px-3 py-2 font-medium">t-Statistic</th>
                        <th className="px-3 py-2 font-medium">p-Value</th>
                        <th className="px-3 py-2 font-medium">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.regressionCoefficients.map((coef, i) => (
                        <tr key={i} className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200">{coef.variable}</td>
                          <td className="px-3 py-2 text-cyan-300 font-bold">{coef.estimate}</td>
                          <td className="px-3 py-2 text-slate-400">{coef.stdError}</td>
                          <td className="px-3 py-2 text-slate-300">{coef.tStat}</td>
                          <td className="px-3 py-2 text-slate-300">{coef.pValue < 0.0001 ? '< 0.0001' : coef.pValue}</td>
                          <td className="px-3 py-2">
                            {coef.pValue < 0.05 ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-sans">
                                Significant (p &lt; 0.05)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px] font-sans">
                                Not Significant
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Chi-Square Contingency Table Matrix */}
            {result.contingency && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Cross-Tabulation Matrix (Observed vs Expected Counts)</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-border">
                    <thead className="bg-surface-raised text-[11px] uppercase text-muted border-b border-border">
                      <tr>
                        <th className="px-3 py-2 border-r border-border font-semibold text-slate-200">
                          Row / Column
                        </th>
                        {result.contingency.colLabels.map((c) => (
                          <th key={c} className="px-3 py-2 border-r border-border text-center font-semibold text-slate-200">
                            {c}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center font-bold text-slate-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.contingency.rowLabels.map((r, ri) => (
                        <tr key={r} className="hover:bg-surface-raised/20">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200 border-r border-border">
                            {r}
                          </td>
                          {result.contingency!.colLabels.map((c, ci) => {
                            const obs = result.contingency!.observed[ri][ci];
                            const exp = result.contingency!.expected[ri][ci];
                            const diff = obs - exp;
                            return (
                              <td key={c} className="px-3 py-2 border-r border-border text-center">
                                <div className="font-bold text-slate-100">{obs}</div>
                                <div className="text-[9px] text-muted">exp: {exp}</div>
                                <div className={`text-[9px] ${diff > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold text-slate-200 bg-surface/40">
                            {result.contingency!.rowTotals[ri]}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface-raised/40 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 font-sans text-slate-200 border-r border-border">Total</td>
                        {result.contingency.colTotals.map((tot, idx) => (
                          <td key={idx} className="px-3 py-2 text-center text-slate-100 border-r border-border">
                            {tot}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center text-cyan-400">
                          {result.contingency.grandTotal}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Reference Guide Modal */}
      <StatisticalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectTest={(id) => setTestType(id as HypothesisTestType)}
      />

      {/* Sampling Modal */}
      <SamplingModal
        isOpen={isSamplingOpen}
        onClose={() => setIsSamplingOpen(false)}
        tables={tables}
        defaultTable={selectedTable}
        onSampleCreated={(newTableName, count) => {
          setSelectedTable(newTableName);
          if (onSampleCreated) onSampleCreated(newTableName, count);
        }}
      />
    </div>
  );
};
