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
import { DistributionGraphs } from './DistributionGraphs';
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
  Layers,
  Network,
  CheckSquare,
  Square,
  Binary,
} from 'lucide-react';

interface HypothesisStudioProps {
  tables: TableMeta[];
  activeTableName: string;
  onSampleCreated?: (tableName: string, count: number) => void;
}

interface TestDescriptor {
  type: HypothesisTestType;
  title: string;
  category: 'Means' | 'Categorical' | 'Predictive' | 'Non-Parametric' | 'Clustering';
  shortDesc: string;
  badge: string;
}

const TEST_OPTIONS: TestDescriptor[] = [
  // Means
  {
    type: 'welch_ttest',
    title: "Two-Sample Welch's t-Test",
    category: 'Means',
    shortDesc: 'A/B testing: Compare means of two independent cohorts without equal variance assumption',
    badge: 'A/B Means',
  },
  {
    type: 'one_sample_ttest',
    title: 'One-Sample t-Test',
    category: 'Means',
    shortDesc: 'Test if a numeric metric statistically differs from an established KPI benchmark target',
    badge: 'Benchmark',
  },
  {
    type: 'paired_ttest',
    title: 'Paired Samples t-Test',
    category: 'Means',
    shortDesc: 'Compare repeated measures or before-and-after metrics for the exact same subjects',
    badge: 'Before / After',
  },
  {
    type: 'one_way_anova',
    title: 'One-Way ANOVA (F-Test)',
    category: 'Means',
    shortDesc: 'Compare continuous metric variation across 3 or more categorical segments or departments',
    badge: 'Multi-Group',
  },

  // Categorical & Proportions
  {
    type: 'proportion_ztest',
    title: 'Two-Sample Z-Test of Proportions',
    category: 'Categorical',
    shortDesc: 'Digital A/B testing: Test if conversion rate A significantly outperforms conversion rate B',
    badge: 'Conversion A/B',
  },
  {
    type: 'chi_square',
    title: 'Chi-Square Independence (χ²)',
    category: 'Categorical',
    shortDesc: 'Test whether two categorical attributes are statistically associated or independent',
    badge: 'Contingency',
  },

  // Predictive & Multivariate
  {
    type: 'linear_regression',
    title: 'OLS Linear Regression (Single X)',
    category: 'Predictive',
    shortDesc: 'Predict continuous outcome Y from a single independent predictor X with slope & intercept',
    badge: 'Simple OLS',
  },
  {
    type: 'multiple_regression',
    title: 'Multiple Linear Regression (Multivariate OLS)',
    category: 'Predictive',
    shortDesc: 'Predict continuous outcome Y from multiple independent predictors (X₁, X₂, ...) with VIF',
    badge: 'Multivariate OLS',
  },
  {
    type: 'logistic_regression',
    title: 'Binary Logistic Regression (Logit Classification)',
    category: 'Predictive',
    shortDesc: 'Predict binary outcome Y ∈ {0, 1} with Odds Ratios (e^β) and classification confusion matrix',
    badge: 'Logit Classification',
  },
  {
    type: 'correlation',
    title: 'Pearson Correlation Test',
    category: 'Predictive',
    shortDesc: 'Evaluate the direction and linear relationship strength (r) between two continuous metrics',
    badge: 'Linear Correlation',
  },

  // Non-Parametric
  {
    type: 'mann_whitney',
    title: 'Mann-Whitney U Test (Wilcoxon Rank-Sum)',
    category: 'Non-Parametric',
    shortDesc: 'Compare rank distributions between two groups when data is skewed or non-normal',
    badge: '2-Group Non-Param',
  },
  {
    type: 'kruskal_wallis',
    title: 'Kruskal-Wallis H-Test',
    category: 'Non-Parametric',
    shortDesc: 'Non-parametric alternative to ANOVA: compare medians across 3+ cohorts on skewed data',
    badge: 'Multi-Group Non-Param',
  },
  {
    type: 'wilcoxon_signed_rank',
    title: 'Wilcoxon Signed-Rank Test',
    category: 'Non-Parametric',
    shortDesc: 'Non-parametric paired test for Before/After ratings, CSAT, or skewed paired differences',
    badge: 'Paired Non-Param',
  },
  {
    type: 'spearman_correlation',
    title: "Spearman's Rank Correlation Test",
    category: 'Non-Parametric',
    shortDesc: 'Measure monotonic relationship (ρ) robust to non-linear curves and extreme outliers',
    badge: 'Monotonic Rank',
  },

  // Segmentation & Clustering
  {
    type: 'kmeans_clustering',
    title: 'K-Means Cluster Analysis (Segmentation)',
    category: 'Clustering',
    shortDesc: 'Unsupervised machine learning: Partition records into k natural segments with WCSS & centroids',
    badge: 'Cluster Analysis',
  },
];

export const HypothesisStudio: React.FC<HypothesisStudioProps> = ({
  tables,
  activeTableName,
  onSampleCreated,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>(activeTableName || (tables[0]?.name ?? ''));
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [testType, setTestType] = useState<HypothesisTestType>('welch_ttest');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [groupColumn, setGroupColumn] = useState<string>('');
  const [secondaryColumn, setSecondaryColumn] = useState<string>('');
  const [selectedPredictors, setSelectedPredictors] = useState<string[]>([]);
  const [benchmarkValue, setBenchmarkValue] = useState<number>(100);
  const [successValue, setSuccessValue] = useState<string>('1');
  const [numClusters, setNumClusters] = useState<number>(3);
  const [alpha, setAlpha] = useState<number>(0.05);
  const [result, setResult] = useState<HypothesisTestResult | null>(null);
  const [targetNumericData, setTargetNumericData] = useState<number[]>([]);
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
      if (
        type.includes('INT') ||
        type.includes('REAL') ||
        type.includes('NUM') ||
        type.includes('FLOAT') ||
        type.includes('DOUBLE')
      ) {
        num.push(c.name);
      } else {
        cat.push(c.name);
      }
    });
    return {
      numericColumns: num.length > 0 ? num : columns,
      categoricalColumns: cat.length > 0 ? cat : columns,
    };
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
      if (selectedPredictors.length === 0 && numericColumns.length > 1) {
        setSelectedPredictors(numericColumns.slice(1, 4));
      }
    }
  }, [selectedTable, testType, columns, numericColumns, categoricalColumns]);

  const togglePredictor = (col: string) => {
    setSelectedPredictors((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const filteredTests = useMemo(() => {
    if (categoryFilter === 'All') return TEST_OPTIONS;
    return TEST_OPTIONS.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  const activeTestMeta = useMemo(() => {
    return TEST_OPTIONS.find((t) => t.type === testType) || TEST_OPTIONS[0];
  }, [testType]);

  // Execute the test
  const handleRunTest = () => {
    setError(null);
    try {
      if (!selectedTable) {
        throw new Error('Please select a table to analyze.');
      }
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
        predictorColumns: selectedPredictors,
        benchmarkValue,
        successValue,
        numClusters,
        alpha,
        alternative: 'two-sided',
      };

      const testRes = executeHypothesisTest(config, queryRes.columns, queryRes.values);
      setResult(testRes);

      // Extract numeric values of target column for low-graphic distribution graphs
      const tIdx = queryRes.columns.indexOf(targetColumn);
      if (tIdx !== -1) {
        const vals = queryRes.values
          .map((r) => {
            const v = r[tIdx];
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
              const p = Number(v.replace(/[$,]/g, '').trim());
              return isNaN(p) ? null : p;
            }
            return null;
          })
          .filter((v): v is number => v !== null && isFinite(v));
        setTargetNumericData(vals);
      } else {
        setTargetNumericData([]);
      }
    } catch (err: any) {
      console.error('Hypothesis Test error:', err);
      setError(err.message || 'Failed to execute hypothesis test.');
      setResult(null);
      setTargetNumericData([]);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const text = `=== BabySQL Enterprise BRM: ${result.testName} ===
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
          Ingest a CSV file or enable <strong>Sample Mode</strong> from the top bar to run A/B tests, ANOVA, Chi-Square, Multivariate Regressions, and Cluster Analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left Control Panel: Test Configuration */}
      <div className="w-full lg:w-88 border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border bg-surface-raised/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Enterprise BRM Studio
              </h2>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Business Research Methods &amp; Mathematical Inference
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

          {/* Model Category Tabs */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Model Category</label>
            <div className="flex flex-wrap gap-1">
              {['All', 'Means', 'Categorical', 'Predictive', 'Non-Parametric', 'Clustering'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-surface-raised text-muted hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Statistical Test Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Statistical Test / Model</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as HypothesisTestType)}
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary font-medium cursor-pointer"
            >
              {filteredTests.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Short Description Banner */}
          <div className="p-2.5 rounded bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-200/90 leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-300 mr-1">[{activeTestMeta.badge}]:</span>
              {activeTestMeta.shortDesc}
            </div>
          </div>

          {/* Variable Pickers */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            {/* Target Column (Dependent Variable / Metric) */}
            {testType !== 'kmeans_clustering' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'chi_square'
                    ? 'First Categorical Variable (Rows)'
                    : testType === 'proportion_ztest'
                    ? 'Binary Target Outcome Column (Success/Failure)'
                    : testType === 'logistic_regression'
                    ? 'Binary Dependent Variable Y ∈ {0, 1}'
                    : testType === 'multiple_regression' || testType === 'linear_regression'
                    ? 'Dependent Outcome Variable (Y)'
                    : 'Metric / Target Column (Continuous)'}
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {(testType === 'chi_square' ? categoricalColumns : testType === 'proportion_ztest' || testType === 'logistic_regression' ? columns : numericColumns).map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Success Target Value for Proportion Z-Test */}
            {testType === 'proportion_ztest' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Success Target Value (e.g. 1, true, converted)
                </label>
                <input
                  type="text"
                  value={successValue}
                  onChange={(e) => setSuccessValue(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                  placeholder="1"
                />
              </div>
            )}

            {/* Grouping Column for 2-sample t-test, ANOVA, Mann-Whitney, Chi-Square, Proportions */}
            {(testType === 'welch_ttest' ||
              testType === 'one_way_anova' ||
              testType === 'mann_whitney' ||
              testType === 'kruskal_wallis' ||
              testType === 'proportion_ztest' ||
              testType === 'chi_square') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'chi_square'
                    ? 'Second Categorical Variable (Columns)'
                    : 'Grouping / Cohort Column (Categories)'}
                </label>
                <select
                  value={groupColumn}
                  onChange={(e) => setGroupColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {categoricalColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Secondary Column for Paired t-test, Wilcoxon, Simple Regression, Correlation */}
            {(testType === 'paired_ttest' ||
              testType === 'wilcoxon_signed_rank' ||
              testType === 'correlation' ||
              testType === 'spearman_correlation' ||
              testType === 'linear_regression') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'linear_regression'
                    ? 'Independent Predictor Column (X)'
                    : testType === 'paired_ttest' || testType === 'wilcoxon_signed_rank'
                    ? 'Comparison / "After" Column'
                    : 'Second Numeric Column'}
                </label>
                <select
                  value={secondaryColumn}
                  onChange={(e) => setSecondaryColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multi-Predictor / Feature Selector for Multiple Regression, Logistic, and K-Means */}
            {(testType === 'multiple_regression' ||
              testType === 'logistic_regression' ||
              testType === 'kmeans_clustering') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'kmeans_clustering'
                    ? 'Select Numeric Features to Cluster (2+ Required)'
                    : 'Select Independent Predictors (X₁, X₂, ...)'}
                </label>
                <div className="max-h-36 overflow-y-auto p-2 rounded bg-background border border-border space-y-1.5">
                  {numericColumns
                    .filter((col) => testType === 'kmeans_clustering' || col !== targetColumn)
                    .map((col) => {
                      const isSelected = selectedPredictors.includes(col);
                      return (
                        <div
                          key={col}
                          onClick={() => togglePredictor(col)}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-200 font-medium'
                              : 'hover:bg-surface-raised text-slate-400'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-muted" />
                          )}
                          <span>{col}</span>
                        </div>
                      );
                    })}
                </div>
                <div className="text-[10px] text-muted mt-1">
                  {selectedPredictors.length} features selected
                </div>
              </div>
            )}

            {/* Clusters k Selector for K-Means */}
            {testType === 'kmeans_clustering' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Number of Clusters (k)
                </label>
                <div className="flex gap-1.5">
                  {[2, 3, 4, 5, 6].map((kVal) => (
                    <button
                      key={kVal}
                      type="button"
                      onClick={() => setNumClusters(kVal)}
                      className={`flex-1 py-1 rounded border text-xs font-mono font-bold transition-all ${
                        numClusters === kVal
                          ? 'bg-primary/20 border-primary text-cyan-300'
                          : 'bg-background border-border text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      k={kVal}
                    </button>
                  ))}
                </div>
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

            {/* Significance Level Alpha (Not needed for unsupervised clustering) */}
            {testType !== 'kmeans_clustering' && (
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
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleRunTest}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Run Statistical Model</span>
          </button>
        </div>
      </div>

      {/* Right Results Panel: In-Depth Business Output & Diagnostics */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-rose-200">Execution Error</h4>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="h-full flex flex-col items-center justify-center py-16 text-center text-muted">
            <div className="w-12 h-12 rounded-xl bg-surface-raised border border-border flex items-center justify-center mb-3 text-cyan-400">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No Model Run Yet</h3>
            <p className="text-xs text-muted max-w-sm mt-1">
              Select your test parameters on the left and click <strong>"Run Statistical Model"</strong> to generate executive insights and hypothesis tests.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Smart Statistical Assumption Advisory Banner */}
            {result.diagnostics?.recommendation && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-2">
                    <span>Statistical Diagnostics Advisory</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200">
                      Skew: {result.diagnostics.skewness} • Kurt: {result.diagnostics.kurtosis} • JB p: {result.diagnostics.jarqueBeraPVal}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-normal">
                    {result.diagnostics.recommendation}
                  </p>
                </div>
              </div>
            )}

            {/* Verdict Hero Card */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      result.executiveSummary.verdict === 'significant'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {result.executiveSummary.verdict === 'significant' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      {result.executiveSummary.headline}
                    </h3>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      {result.testName} • N = {result.sampleSize} • α = {result.alpha}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopySummary}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-border hover:bg-surface-raised text-xs text-slate-300 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>

              {/* Plain-English Executive Narrative */}
              <div className="mt-3.5 p-3.5 rounded-lg bg-background/80 border border-white/5">
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
                <span>Test Metrics &amp; Parameters</span>
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

            {/* Low-Graphic Distribution Graphs: Boxplot & KDE Density Curve for continuous targets */}
            {targetNumericData.length > 2 && (
              <DistributionGraphs values={targetNumericData} metricName={targetColumn} />
            )}

            {/* K-Means Clustering Profiles & Segment Summary */}
            {result.clustering && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-cyan-400" />
                  <span>K-Means Cluster Profiling &amp; Segment Centroids</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Cohort / Segment</th>
                        <th className="px-3 py-2 font-medium">Record Count</th>
                        <th className="px-3 py-2 font-medium">% Share</th>
                        {result.clustering.features.map((feat) => (
                          <th key={feat} className="px-3 py-2 font-medium font-mono">
                            {feat} (Centroid)
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">WCSS (Inertia)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.clustering.clusters.map((cl) => (
                        <tr key={cl.clusterId} className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-semibold text-cyan-300">
                            {cl.name}
                          </td>
                          <td className="px-3 py-2 text-slate-200">{cl.size}</td>
                          <td className="px-3 py-2 text-emerald-400 font-bold">{cl.percentage}%</td>
                          {result.clustering!.features.map((feat) => (
                            <td key={feat} className="px-3 py-2 text-slate-300">
                              {cl.centroid[feat]}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-slate-400">{cl.wcss}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Two-Sample Proportion A/B Testing Card */}
            {result.proportionData && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 text-cyan-400" />
                  <span>A/B Conversion Rate Lift &amp; Risk Difference</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 1: {result.proportionData.group1Name}</span>
                    <span className="text-lg font-bold text-cyan-300">
                      {(result.proportionData.rate1 * 100).toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      {result.proportionData.count1} / {result.proportionData.total1} converted
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 2: {result.proportionData.group2Name}</span>
                    <span className="text-lg font-bold text-slate-200">
                      {(result.proportionData.rate2 * 100).toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      {result.proportionData.count2} / {result.proportionData.total2} converted
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Relative Conversion Lift</span>
                    <span className={`text-lg font-bold ${result.proportionData.liftPercent > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {result.proportionData.liftPercent > 0 ? '+' : ''}{result.proportionData.liftPercent}%
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      95% CI: [{(result.proportionData.ciLower * 100).toFixed(2)}%, {(result.proportionData.ciUpper * 100).toFixed(2)}%]
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Regression Model Coefficients Table (OLS & Multiple Regression & Logistic) */}
            {result.regressionCoefficients && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {result.testType === 'logistic_regression'
                        ? 'Logistic Regression Parameter Estimates & Odds Ratios'
                        : 'Regression Model Parameter Estimates'}
                    </span>
                  </span>
                  {result.regressionCoefficients.some((c) => c.vif !== undefined) && (
                    <span className="text-[11px] text-muted font-normal">
                      VIF &gt; 5 indicates potential multicollinearity
                    </span>
                  )}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Predictor</th>
                        <th className="px-3 py-2 font-medium">Coefficient (β)</th>
                        <th className="px-3 py-2 font-medium">Std Error</th>
                        <th className="px-3 py-2 font-medium">
                          {result.testType === 'logistic_regression' ? 'Wald Z' : 't-Statistic'}
                        </th>
                        <th className="px-3 py-2 font-medium">p-Value</th>
                        {result.testType === 'logistic_regression' && (
                          <>
                            <th className="px-3 py-2 font-medium">Odds Ratio (e^β)</th>
                            <th className="px-3 py-2 font-medium">95% CI of OR</th>
                          </>
                        )}
                        {result.regressionCoefficients.some((c) => c.vif !== undefined) && (
                          <th className="px-3 py-2 font-medium">VIF</th>
                        )}
                        <th className="px-3 py-2 font-medium">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.regressionCoefficients.map((coef, i) => (
                        <tr key={i} className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200">{coef.variable}</td>
                          <td className="px-3 py-2 text-cyan-300 font-bold">{coef.estimate}</td>
                          <td className="px-3 py-2 text-slate-400">{coef.stdError}</td>
                          <td className="px-3 py-2 text-slate-300">{coef.zStat ?? coef.tStat}</td>
                          <td className="px-3 py-2 text-slate-300">{coef.pValue < 0.0001 ? '< 0.0001' : coef.pValue}</td>
                          {result.testType === 'logistic_regression' && (
                            <>
                              <td className="px-3 py-2 text-emerald-400 font-bold">{coef.oddsRatio}</td>
                              <td className="px-3 py-2 text-slate-400">[{coef.ciLower}, {coef.ciUpper}]</td>
                            </>
                          )}
                          {coef.vif !== undefined && (
                            <td className="px-3 py-2">
                              <span className={coef.vif > 5 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                {coef.vif}
                              </span>
                            </td>
                          )}
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

            {/* Binary Logistic Classification Confusion Matrix */}
            {result.confusionMatrix && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Classification Confusion Matrix (Cutoff = 0.5)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border border-border font-mono">
                      <thead className="bg-surface-raised text-[10px] uppercase text-muted">
                        <tr>
                          <th className="p-2 border-r border-border">Actual \ Predicted</th>
                          <th className="p-2 border-r border-border text-emerald-300">Pred Positive (1)</th>
                          <th className="p-2 text-slate-300">Pred Negative (0)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="p-2 font-sans font-semibold text-emerald-300 border-r border-border bg-surface-raised/30">
                            Actual Positive (1)
                          </td>
                          <td className="p-2 bg-emerald-500/10 text-emerald-400 font-bold border-r border-border">
                            TP = {result.confusionMatrix.tp}
                          </td>
                          <td className="p-2 bg-amber-500/10 text-amber-400 font-bold">
                            FN = {result.confusionMatrix.fn}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-sans font-semibold text-slate-300 border-r border-border bg-surface-raised/30">
                            Actual Negative (0)
                          </td>
                          <td className="p-2 bg-amber-500/10 text-amber-400 font-bold border-r border-border">
                            FP = {result.confusionMatrix.fp}
                          </td>
                          <td className="p-2 bg-cyan-500/10 text-cyan-400 font-bold">
                            TN = {result.confusionMatrix.tn}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">Accuracy</span>
                      <span className="text-base font-bold text-cyan-400">
                        {(result.confusionMatrix.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">Precision</span>
                      <span className="text-base font-bold text-emerald-400">
                        {(result.confusionMatrix.precision * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">Recall (Sensitivity)</span>
                      <span className="text-base font-bold text-emerald-400">
                        {(result.confusionMatrix.recall * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">F1-Score</span>
                      <span className="text-base font-bold text-cyan-400">
                        {result.confusionMatrix.f1Score}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Charts: Group Comparisons (t-test / ANOVA / Kruskal-Wallis) */}
            {result.groupSummaries && result.groupSummaries.length > 0 && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    <span>Group Means &amp; {Math.round((1 - result.alpha) * 100)}% Confidence Intervals</span>
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
                          {grp.median !== undefined && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Median:</span>
                              <span>{grp.median}</span>
                            </div>
                          )}
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
