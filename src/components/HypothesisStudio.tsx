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
import { generateFullHypothesisMarkdown, downloadTextFile } from '../lib/reportGenerator';
import pkg from 'jstat';
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
  Download,
  FileText,
  Search,
  Activity,
  Sparkles,
} from 'lucide-react';

const jStat = (pkg as any).jStat || pkg;

interface HypothesisStudioProps {
  tables: TableMeta[];
  activeTableName: string;
  onSampleCreated?: (tableName: string, count: number) => void;
}

interface TestDescriptor {
  type: HypothesisTestType;
  title: string;
  category: 'Means & Variance' | 'Categorical & Rates' | 'Predictive' | 'Non-Parametric' | 'Multivariate & Clusters' | 'Outliers & Diagnostics';
  isCommon?: boolean;
  shortDesc: string;
  badge: string;
}

const TEST_OPTIONS: TestDescriptor[] = [
  // Means & Variance
  {
    type: 'welch_ttest',
    title: "Two-Sample Welch's t-Test",
    category: 'Means & Variance',
    isCommon: true,
    shortDesc: 'A/B testing: Compare means of two independent cohorts without equal variance assumption',
    badge: 'A/B Means',
  },
  {
    type: 'one_sample_ttest',
    title: 'One-Sample t-Test',
    category: 'Means & Variance',
    shortDesc: 'Test if a numeric metric statistically differs from an established KPI benchmark target',
    badge: 'Benchmark',
  },
  {
    type: 'paired_ttest',
    title: 'Paired Samples t-Test',
    category: 'Means & Variance',
    isCommon: true,
    shortDesc: 'Compare repeated measures or before-and-after metrics for the exact same subjects',
    badge: 'Before / After',
  },
  {
    type: 'one_way_anova',
    title: 'One-Way ANOVA (F-Test)',
    category: 'Means & Variance',
    isCommon: true,
    shortDesc: 'Compare continuous metric variation across 3 or more categorical segments or departments',
    badge: 'Multi-Group',
  },
  {
    type: 'two_way_anova',
    title: 'Two-Way Factorial ANOVA (A × B + Interaction)',
    category: 'Means & Variance',
    isCommon: true,
    shortDesc: 'Evaluate simultaneous main effects of two categorical factors and their interaction on a continuous metric',
    badge: '2-Factor ANOVA',
  },
  {
    type: 'f_test_variance',
    title: 'Two-Sample F-Test for Equality of Variances',
    category: 'Means & Variance',
    shortDesc: 'Test whether two cohorts have equal population variances (σ₁² = σ₂²) to verify homoscedasticity',
    badge: 'Variance Ratio',
  },

  // Categorical & Rates
  {
    type: 'proportion_ztest',
    title: 'Two-Sample Z-Test of Proportions',
    category: 'Categorical & Rates',
    isCommon: true,
    shortDesc: 'Digital A/B testing: Test if conversion rate A significantly outperforms conversion rate B',
    badge: 'Conversion A/B',
  },
  {
    type: 'chi_square',
    title: 'Chi-Square Independence (χ²)',
    category: 'Categorical & Rates',
    isCommon: true,
    shortDesc: 'Test whether two categorical attributes are statistically associated or independent',
    badge: 'Contingency',
  },
  {
    type: 'chi_square_gof',
    title: 'Chi-Square Goodness-of-Fit Test',
    category: 'Categorical & Rates',
    shortDesc: 'Test whether observed category frequencies fit an expected uniform or hypothesized distribution',
    badge: 'Goodness-of-Fit',
  },
  {
    type: 'mcnemar_test',
    title: "McNemar's Paired Test (Before vs After Conversion)",
    category: 'Categorical & Rates',
    shortDesc: 'Test paired binary conversion transitions before and after an intervention with Edwards correction',
    badge: 'Paired Binary',
  },
  {
    type: 'binomial_test',
    title: 'Exact Binomial Test (Sign Test)',
    category: 'Categorical & Rates',
    shortDesc: 'Small-sample exact test of success probability against a benchmark p₀ with Clopper-Pearson CI',
    badge: 'Exact Binomial',
  },
  {
    type: 'poisson_test',
    title: 'Poisson Rate Comparison Test (Incidence Rates)',
    category: 'Categorical & Rates',
    shortDesc: 'Compare event occurrence rates per unit exposure between two cohorts with rate ratio CI',
    badge: 'Poisson Rates',
  },

  // Predictive & Multivariate
  {
    type: 'linear_regression',
    title: 'OLS Linear Regression (Single X)',
    category: 'Predictive',
    isCommon: true,
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
    isCommon: true,
    shortDesc: 'Evaluate the direction and linear relationship strength (r) between two continuous metrics',
    badge: 'Linear Correlation',
  },
  {
    type: 'cronbach_alpha',
    title: "Cronbach's Alpha (Survey Scale Reliability)",
    category: 'Predictive',
    shortDesc: 'Evaluate internal consistency of multi-item Likert scales, CSAT, or NPS surveys with item-total stats',
    badge: 'Survey Scale Reliability',
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

  // Multivariate & Clusters
  {
    type: 'kmeans_clustering',
    title: 'K-Means Cluster Analysis (Segmentation)',
    category: 'Multivariate & Clusters',
    shortDesc: 'Unsupervised machine learning: Partition records into k natural segments with WCSS & centroids',
    badge: 'Cluster Analysis',
  },
  {
    type: 'pca',
    title: 'Principal Component Analysis (PCA)',
    category: 'Multivariate & Clusters',
    shortDesc: 'Extract principal eigenvectors, scree variance explained, loadings matrix, and 2D projections',
    badge: 'PCA Dimension Reduction',
  },

  // Outliers & Diagnostics
  {
    type: 'dixon_q_test',
    title: "Dixon's Q-Test (Outlier Detection for n ≤ 30)",
    category: 'Outliers & Diagnostics',
    shortDesc: 'Detect and mathematically verify extreme minimum/maximum outliers in small datasets',
    badge: 'Outlier Detection',
  },
];

const CATEGORY_TABS = [
  '⭐ Common',
  'Means & Variance',
  'Categorical & Rates',
  'Predictive',
  'Non-Parametric',
  'Multivariate & Clusters',
  'Outliers & Diagnostics',
  'All',
];

export const HypothesisStudio: React.FC<HypothesisStudioProps> = ({
  tables,
  activeTableName,
  onSampleCreated,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>(activeTableName || (tables[0]?.name ?? ''));
  const [categoryFilter, setCategoryFilter] = useState<string>('⭐ Common');
  const [testType, setTestType] = useState<HypothesisTestType>('welch_ttest');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [groupColumn, setGroupColumn] = useState<string>('');
  const [secondaryColumn, setSecondaryColumn] = useState<string>('');
  const [selectedPredictors, setSelectedPredictors] = useState<string[]>([]);
  const [predictorSearch, setPredictorSearch] = useState<string>('');
  const [benchmarkValue, setBenchmarkValue] = useState<number>(100);
  const [successValue, setSuccessValue] = useState<string>('1');
  const [numClusters, setNumClusters] = useState<number>(3);
  const [alpha, setAlpha] = useState<number>(0.05);
  const [decisionThreshold, setDecisionThreshold] = useState<number>(0.50);
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
      if (testType === 'cronbach_alpha' || testType === 'pca') {
        if (selectedPredictors.length === 0 || selectedPredictors.some((p) => !columns.includes(p))) {
          setSelectedPredictors(numericColumns.slice(0, Math.min(5, numericColumns.length)));
        }
      } else if (selectedPredictors.length === 0 && numericColumns.length > 1) {
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
    if (categoryFilter === '⭐ Common') return TEST_OPTIONS.filter((t) => t.isCommon);
    if (categoryFilter === 'All') return TEST_OPTIONS;
    return TEST_OPTIONS.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  // If current test is not in filtered tests, switch to first test of category
  useEffect(() => {
    if (filteredTests.length > 0 && !filteredTests.some((t) => t.type === testType)) {
      setTestType(filteredTests[0].type);
    }
  }, [filteredTests, testType]);

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
        decisionThreshold: testType === 'logistic_regression' ? decisionThreshold : undefined,
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

  const handleApplyThreshold = (newCutoff: number) => {
    setDecisionThreshold(newCutoff);
    if (!selectedTable || !targetColumn) return;
    try {
      const queryRes = executeQuery(`SELECT * FROM "${selectedTable}";`);
      if (!queryRes.values || queryRes.values.length === 0) return;
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
        decisionThreshold: newCutoff,
        alpha,
        alternative: 'two-sided',
      };
      const testRes = executeHypothesisTest(config, queryRes.columns, queryRes.values);
      setResult(testRes);
    } catch (err) {
      console.error('Threshold re-run error:', err);
    }
  };

  const [copiedFull, setCopiedFull] = useState<boolean>(false);

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

  const handleCopyFullReport = () => {
    if (!result) return;
    const report = generateFullHypothesisMarkdown(result, targetColumn, targetNumericData);
    navigator.clipboard.writeText(report);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    const report = generateFullHypothesisMarkdown(result, targetColumn, targetNumericData);
    const cleanName = result.testType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadTextFile(`BabySQL_Report_${cleanName}_${Date.now()}.md`, report, 'text/markdown');
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const cleanName = result.testType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadTextFile(`BabySQL_Report_${cleanName}_${Date.now()}.json`, JSON.stringify(result, null, 2), 'application/json');
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
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border bg-surface-raised/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Enterprise Hypothesis Studio
              </h2>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Enterprise Hypothesis Testing &amp; Mathematical Inference
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
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-400 mb-1">Model Category</label>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-600 dark:border-cyan-500/40 font-semibold shadow-sm'
                      : 'bg-surface-raised text-slate-700 dark:text-muted hover:text-slate-950 dark:hover:text-slate-200 border border-border/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Statistical Test Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-400 mb-1">Statistical Test / Model</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as HypothesisTestType)}
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-primary font-medium cursor-pointer"
            >
              {filteredTests.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Short Description Banner */}
          <div className="p-2.5 rounded bg-cyan-500/10 dark:bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-950 dark:text-cyan-200/90 leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-900 dark:text-cyan-300 mr-1">[{activeTestMeta.badge}]:</span>
              {activeTestMeta.shortDesc}
            </div>
          </div>

          {/* Variable Pickers */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            {/* Target Column (Dependent Variable / Metric) */}
            {testType !== 'kmeans_clustering' && testType !== 'cronbach_alpha' && testType !== 'pca' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'chi_square' || testType === 'chi_square_gof'
                    ? 'Categorical Variable (Frequencies / Categories)'
                    : testType === 'mcnemar_test'
                    ? 'Pre-Intervention / Time 1 Outcome (Binary)'
                    : testType === 'binomial_test'
                    ? 'Binary Trial Outcome Column (Pass/Fail)'
                    : testType === 'poisson_test'
                    ? 'Observed Event Count (Incidence Column)'
                    : testType === 'dixon_q_test'
                    ? 'Continuous Metric with Suspect Outlier (n ≤ 30)'
                    : testType === 'two_way_anova'
                    ? 'Dependent Continuous Outcome Metric (Y)'
                    : testType === 'f_test_variance'
                    ? 'Continuous Metric to Compare Variance'
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
                  {(testType === 'chi_square' || testType === 'chi_square_gof'
                    ? categoricalColumns
                    : testType === 'proportion_ztest' || testType === 'logistic_regression' || testType === 'mcnemar_test' || testType === 'binomial_test'
                    ? columns
                    : numericColumns
                  ).map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Success Target Value for Proportion Z-Test, McNemar, and Binomial */}
            {(testType === 'proportion_ztest' || testType === 'mcnemar_test' || testType === 'binomial_test') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Success Target Value (e.g. 1, true, converted, pass)
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

            {/* Grouping Column */}
            {(testType === 'welch_ttest' ||
              testType === 'one_way_anova' ||
              testType === 'two_way_anova' ||
              testType === 'f_test_variance' ||
              testType === 'poisson_test' ||
              testType === 'mann_whitney' ||
              testType === 'kruskal_wallis' ||
              testType === 'proportion_ztest' ||
              testType === 'chi_square') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'chi_square'
                    ? 'Second Categorical Variable (Columns)'
                    : testType === 'two_way_anova'
                    ? 'Factor A (First Categorical Dimension)'
                    : testType === 'f_test_variance'
                    ? 'Grouping Column (2 Cohorts to Compare Variance)'
                    : testType === 'poisson_test'
                    ? 'Grouping Column (2 Cohorts to Compare Incidence Rates)'
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

            {/* Secondary Metric / Predictor / Factor B / After / Exposure */}
            {(testType === 'paired_ttest' ||
              testType === 'wilcoxon_signed_rank' ||
              testType === 'linear_regression' ||
              testType === 'correlation' ||
              testType === 'spearman_correlation' ||
              testType === 'two_way_anova' ||
              testType === 'mcnemar_test' ||
              testType === 'poisson_test') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'two_way_anova'
                    ? 'Factor B (Second Categorical Dimension)'
                    : testType === 'mcnemar_test'
                    ? 'Post-Intervention / Time 2 Outcome (Binary)'
                    : testType === 'poisson_test'
                    ? 'Exposure / Person-Time Column (Optional)'
                    : testType === 'paired_ttest' || testType === 'wilcoxon_signed_rank'
                    ? 'Second Paired Metric (Numeric)'
                    : testType === 'linear_regression'
                    ? 'Independent Predictor Variable (X)'
                    : 'Second Correlated Variable (Continuous)'}
                </label>
                <select
                  value={secondaryColumn}
                  onChange={(e) => setSecondaryColumn(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {testType === 'two_way_anova'
                    ? categoricalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))
                    : testType === 'mcnemar_test'
                    ? columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))
                    : testType === 'poisson_test'
                    ? [
                        <option key="__none__" value="">
                          (None - Uniform Unit Exposure 1.0)
                        </option>,
                        ...numericColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        )),
                      ]
                    : numericColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                </select>
              </div>
            )}

            {/* Multi-Predictor / Feature Selector for Multiple Regression, Logistic, K-Means, Cronbach, and PCA */}
            {(testType === 'multiple_regression' ||
              testType === 'logistic_regression' ||
              testType === 'kmeans_clustering' ||
              testType === 'cronbach_alpha' ||
              testType === 'pca') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-400">
                    {testType === 'cronbach_alpha'
                      ? 'Select Scale Questions / Survey Items (2+ Required)'
                      : testType === 'kmeans_clustering'
                      ? 'Select Numeric Features to Cluster (2+ Required)'
                      : testType === 'pca'
                      ? 'Select Numeric Features for PCA (2+ Required)'
                      : 'Select Independent Predictors (X₁, X₂, ...)'}
                  </label>
                  <span className="text-[10px] font-mono text-cyan-800 dark:text-cyan-400 font-semibold">
                    {selectedPredictors.length} selected
                  </span>
                </div>

                {/* Variable Search Bar & Quick Actions */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500 dark:text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={predictorSearch}
                      onChange={(e) => setPredictorSearch(e.target.value)}
                      placeholder="Filter variables..."
                      className="w-full pl-6 pr-5 py-1 bg-background border border-border rounded text-[11px] text-slate-900 dark:text-slate-200 placeholder:text-muted focus:outline-none focus:border-primary font-medium"
                    />
                    {predictorSearch && (
                      <button
                        type="button"
                        onClick={() => setPredictorSearch('')}
                        className="absolute right-1.5 top-1.5 text-[10px] text-muted hover:text-slate-900 dark:hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const candidates = numericColumns.filter(
                        (col) => testType === 'kmeans_clustering' || testType === 'cronbach_alpha' || testType === 'pca' || col !== targetColumn
                      );
                      setSelectedPredictors(candidates);
                    }}
                    className="px-1.5 py-1 rounded bg-surface-raised border border-border text-[10px] text-cyan-800 dark:text-cyan-400 font-semibold hover:bg-border transition-all cursor-pointer"
                    title="Select all available numerical variables"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPredictors([])}
                    className="px-1.5 py-1 rounded bg-surface-raised border border-border text-[10px] text-slate-600 dark:text-muted hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto p-2 rounded bg-background border border-border space-y-1">
                  {numericColumns
                    .filter((col) => testType === 'kmeans_clustering' || testType === 'cronbach_alpha' || testType === 'pca' || col !== targetColumn)
                    .filter((col) => !predictorSearch || col.toLowerCase().includes(predictorSearch.toLowerCase()))
                    .map((col) => {
                      const isSelected = selectedPredictors.includes(col);
                      return (
                        <div
                          key={col}
                          onClick={() => togglePredictor(col)}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-950 dark:text-cyan-200 font-semibold border border-cyan-500/30'
                              : 'hover:bg-surface-raised text-slate-700 dark:text-slate-400 border border-transparent'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 dark:text-muted flex-shrink-0" />
                          )}
                          <span className="truncate">{col}</span>
                        </div>
                      );
                    })}
                  {numericColumns
                    .filter((col) => testType === 'kmeans_clustering' || testType === 'cronbach_alpha' || testType === 'pca' || col !== targetColumn)
                    .filter((col) => !predictorSearch || col.toLowerCase().includes(predictorSearch.toLowerCase())).length === 0 && (
                    <div className="text-[11px] text-muted text-center py-2 italic">
                      No matching variables found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decision Cutoff Threshold (τ) for Logistic Regression */}
            {testType === 'logistic_regression' && (
              <div className="space-y-1.5 p-2.5 rounded bg-surface border border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-200">
                    Decision Cutoff Threshold (τ)
                  </label>
                  <span className="font-mono text-cyan-400 font-bold text-xs bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    τ = {decisionThreshold.toFixed(2)} ({(decisionThreshold * 100).toFixed(0)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={decisionThreshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (result && result.testType === 'logistic_regression') {
                      handleApplyThreshold(val);
                    } else {
                      setDecisionThreshold(val);
                    }
                  }}
                  className="w-full h-1.5 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center justify-between text-[9px] text-muted font-mono">
                  <span>0.05 (High Recall)</span>
                  <span>0.50 (Standard)</span>
                  <span>0.95 (High Precision)</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (result && result.testType === 'logistic_regression') {
                        handleApplyThreshold(0.50);
                      } else {
                        setDecisionThreshold(0.50);
                      }
                    }}
                    className={`flex-1 py-1 rounded text-[10px] font-medium border transition-all ${
                      decisionThreshold === 0.50
                        ? 'bg-primary/20 border-primary text-cyan-300 font-bold'
                        : 'bg-background border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Standard 0.50
                  </button>
                  {result?.confusionMatrix?.optimalThreshold !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleApplyThreshold(result.confusionMatrix!.optimalThreshold!)}
                      className={`flex-1 py-1 rounded text-[10px] font-medium border transition-all ${
                        decisionThreshold === result.confusionMatrix.optimalThreshold
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title="Apply optimal Youden threshold that balances sensitivity and specificity"
                    >
                      Optimal Youden (τ = {result.confusionMatrix.optimalThreshold})
                    </button>
                  )}
                </div>
                <p className="text-[9.5px] text-muted leading-tight pt-1">
                  Lower thresholds boost event sensitivity (recall) for imbalanced outcomes (e.g. failure rate &lt; 10%).
                </p>
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

            {/* Benchmark Input for One-Sample t-test & Exact Binomial Test */}
            {(testType === 'one_sample_ttest' || testType === 'binomial_test') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {testType === 'binomial_test'
                    ? 'Hypothesized Success Probability p₀ (e.g. 0.50)'
                    : 'Target Benchmark Value (μ₀)'}
                </label>
                <input
                  type="number"
                  step={testType === 'binomial_test' ? '0.01' : '1'}
                  value={benchmarkValue}
                  onChange={(e) => setBenchmarkValue(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary font-mono"
                  placeholder={testType === 'binomial_test' ? '0.50' : 'e.g. 100'}
                />
              </div>
            )}

            {/* Significance Level Alpha */}
            {testType !== 'kmeans_clustering' && testType !== 'pca' && (
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
      <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6 space-y-6">
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
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <span>Statistical Diagnostics Advisory</span>
                    {result.testType === 'logistic_regression' ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-950 dark:text-amber-200 font-semibold">
                        {result.diagnostics.classBalance} • EPV: {result.diagnostics.eventsPerVariable}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-950 dark:text-amber-200 font-semibold">
                        Skew: {result.diagnostics.skewness} • Kurt: {result.diagnostics.kurtosis} • JB p: {result.diagnostics.jarqueBeraPVal}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed font-normal">
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
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {result.executiveSummary.verdict === 'significant' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {result.executiveSummary.headline}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-muted font-mono mt-0.5">
                      {result.testName} • N = {result.sampleSize} • α = {result.alpha}
                    </p>
                  </div>
                </div>

                {/* Executive Report Actions: Copy & Download Full Report */}
                <div className="self-start sm:self-auto flex items-center flex-wrap gap-2">
                  <button
                    onClick={handleCopyFullReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-raised hover:bg-border text-xs text-slate-800 dark:text-slate-200 border border-border transition-all cursor-pointer font-medium shadow-sm active:scale-95"
                    title="Copy full hypothesis testing report with all tables to clipboard as Markdown"
                  >
                    {copiedFull ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    )}
                    <span>{copiedFull ? 'Full Report Copied!' : 'Copy Full Report'}</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-primary-hover text-white dark:text-slate-950 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Download the full hypothesis report as a Markdown (.md) document"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report (.md)</span>
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface border border-border hover:bg-surface-raised text-xs text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    title="Download raw statistical result data as JSON"
                  >
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Plain-English Executive Narrative */}
              <div className="mt-3.5 p-3.5 rounded-lg bg-surface-raised/60 dark:bg-background/80 border border-border">
                <div className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Executive Business Takeaway</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                  {result.executiveSummary.takeaway}
                </p>
                {result.executiveSummary.effectSizeLabel && (
                  <div className="mt-2 text-[11px] font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded inline-block font-semibold">
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

                {/* A/B Testing Statistical Power & Sample Size Planner */}
                {(() => {
                  const p1 = result.proportionData.rate1;
                  const p2 = result.proportionData.rate2;
                  const n1 = result.proportionData.total1;
                  const n2 = result.proportionData.total2;
                  const zAlpha = jStat.normal.inv(1 - result.alpha / 2, 0, 1);
                  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
                  const zObs = seDiff > 0 ? Math.abs(p1 - p2) / seDiff : 0;
                  const powerAchieved = seDiff > 0 ? Math.max(0, Math.min(1, jStat.normal.cdf(zObs - zAlpha, 0, 1))) : 0;

                  function calcReqN(baseP: number, liftPct: number, targetPower = 0.8) {
                    const pA = baseP;
                    const pB = Math.max(0.001, Math.min(0.999, pA * (1 + liftPct / 100)));
                    if (Math.abs(pB - pA) < 1e-6) return 0;
                    const zBeta = jStat.normal.inv(targetPower, 0, 1);
                    const pBar = (pA + pB) / 2;
                    const num = Math.pow(
                      zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(pA * (1 - pA) + pB * (1 - pB)),
                      2
                    );
                    const den = Math.pow(pB - pA, 2);
                    return Math.ceil(num / den);
                  }

                  const nObsLift = result.proportionData.liftPercent !== 0 ? calcReqN(p1, Math.abs(result.proportionData.liftPercent)) : 0;
                  const nLift5 = calcReqN(p1, 5);
                  const nLift10 = calcReqN(p1, 10);
                  const nLift20 = calcReqN(p1, 20);

                  return (
                    <div className="mt-3 pt-3 border-t border-border/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Statistical Power &amp; Sample Size Determination</span>
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-muted">Achieved Power (1 - β):</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            powerAchieved >= 0.8 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {(powerAchieved * 100).toFixed(1)}% {powerAchieved >= 0.8 ? '(Adequately Powered)' : '(Underpowered)'}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-border/70 rounded-lg">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-surface-raised/50 text-[10px] uppercase text-muted border-b border-border/70 font-sans">
                            <tr>
                              <th className="py-1.5 px-3">Target MDE (% Lift)</th>
                              <th className="py-1.5 px-3">Target Rate (p₂)</th>
                              <th className="py-1.5 px-3 text-right">Required Sample / Variant (n)</th>
                              <th className="py-1.5 px-3 text-right">Total Sample Required (2n)</th>
                              <th className="py-1.5 px-3 text-right font-sans">Adequacy Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {[
                              { label: `Observed Lift (${result.proportionData.liftPercent > 0 ? '+' : ''}${result.proportionData.liftPercent}%)`, reqN: nObsLift, targetRate: p2 },
                              { label: '+5% Minor Lift', reqN: nLift5, targetRate: p1 * 1.05 },
                              { label: '+10% Standard Lift', reqN: nLift10, targetRate: p1 * 1.10 },
                              { label: '+20% Large Lift', reqN: nLift20, targetRate: p1 * 1.20 },
                            ].map((row, idx) => {
                              const totalAvailable = n1 + n2;
                              const isMet = (n1 >= row.reqN && n2 >= row.reqN);
                              return (
                                <tr key={idx} className="hover:bg-surface-raised/20 transition-colors">
                                  <td className="py-1.5 px-3 font-sans font-medium text-slate-200">{row.label}</td>
                                  <td className="py-1.5 px-3 text-slate-400">{(row.targetRate * 100).toFixed(2)}%</td>
                                  <td className="py-1.5 px-3 text-right text-cyan-300 font-bold">{row.reqN.toLocaleString()}</td>
                                  <td className="py-1.5 px-3 text-right text-slate-300">{(row.reqN * 2).toLocaleString()}</td>
                                  <td className="py-1.5 px-3 text-right font-sans text-[10px]">
                                    {isMet ? (
                                      <span className="text-emerald-400 font-medium">✓ Adequately Powered</span>
                                    ) : (
                                      <span className="text-amber-400 font-medium">Need +{(Math.max(0, row.reqN * 2 - totalAvailable)).toLocaleString()} more</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[10px] text-muted">
                        A priori power calculation based on two-sided normal quantile inversion with α = {result.alpha} at 80% power (1 - β = 0.80).
                      </div>
                    </div>
                  );
                })()}
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
                              <td className="px-3 py-2 text-emerald-400 font-bold">
                                {coef.oddsRatio !== undefined
                                  ? coef.oddsRatio < 0.001
                                    ? '< 0.001'
                                    : coef.oddsRatio > 100000
                                    ? coef.oddsRatio.toExponential(2)
                                    : coef.oddsRatio.toLocaleString('en-US', { maximumFractionDigits: 3 })
                                  : '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-400">
                                {coef.ciLower !== undefined && coef.ciUpper !== undefined
                                  ? `[${coef.ciLower < 0.001 ? '< 0.001' : coef.ciLower > 100000 ? coef.ciLower.toExponential(2) : coef.ciLower.toLocaleString('en-US', { maximumFractionDigits: 3 })}, ${coef.ciUpper < 0.001 ? '< 0.001' : coef.ciUpper > 100000 ? coef.ciUpper.toExponential(2) : coef.ciUpper.toLocaleString('en-US', { maximumFractionDigits: 3 })}]`
                                  : '-'}
                              </td>
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

            {/* Regression Residual Diagnostics: Durbin-Watson & Breusch-Pagan */}
            {result.regressionDiagnostics && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Residual Assumption Diagnostics (Gauss-Markov Check)</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Homoscedasticity &amp; Independence
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Durbin-Watson Autocorrelation Card */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-200">
                        Durbin-Watson Autocorrelation
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-sm">
                        d = {result.regressionDiagnostics.durbinWatson}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-muted leading-relaxed">
                      {result.regressionDiagnostics.durbinWatsonInterpretation}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Rule of thumb: Values in [1.5, 2.5] indicate negligible first-order residual autocorrelation.
                    </div>
                  </div>

                  {/* Breusch-Pagan Heteroscedasticity Card */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-200">
                        Breusch-Pagan Homoscedasticity
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-sm">
                        LM = {result.regressionDiagnostics.breuschPaganStat}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10.5px] text-slate-300">
                        p = {result.regressionDiagnostics.breuschPaganPVal}
                      </span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium ${
                          result.regressionDiagnostics.isHomoscedastic
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {result.regressionDiagnostics.isHomoscedastic
                          ? 'Homoscedastic Residuals (Constant Variance Holds)'
                          : 'Heteroscedasticity Detected'}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">
                      H₀: Constant residual variance. p ≥ {result.alpha} confirms valid standard error estimates.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Binary Logistic Classification Confusion Matrix */}
            {result.confusionMatrix && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Classification Confusion Matrix (Cutoff τ = {result.confusionMatrix.threshold ?? 0.50})</span>
                  </h4>
                  {result.confusionMatrix.optimalThreshold !== undefined && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted">Optimal Youden Cutoff:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyThreshold(result.confusionMatrix!.optimalThreshold!)}
                        className={`font-mono px-2 py-0.5 rounded border text-[10.5px] font-semibold transition-all ${
                          decisionThreshold === result.confusionMatrix.optimalThreshold
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-surface-raised text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 cursor-pointer'
                        }`}
                        title="Click to apply optimal Youden cutoff (Maximized Sensitivity + Specificity - 1)"
                      >
                        τ = {result.confusionMatrix.optimalThreshold} (J = {result.confusionMatrix.optimalYoudenJ})
                      </button>
                    </div>
                  )}
                </div>
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

            {/* Cronbach's Alpha Survey Scale Reliability Card & Item-Total Statistics */}
            {result.cronbach && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Survey Scale Internal Consistency &amp; Item-Total Statistics</span>
                  </h4>
                  <span className="text-[10px] text-muted font-mono">
                    Psychometric Reliability Analysis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Raw Cronbach's α</span>
                    <span className="text-xl font-bold text-cyan-400 font-mono">
                      {result.cronbach.alpha}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {result.cronbach.alpha >= 0.7 ? 'Scale is internally consistent' : 'Scale lacks reliability'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Standardized α</span>
                    <span className="text-xl font-bold text-slate-200 font-mono">
                      {result.cronbach.standardizedAlpha}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Based on correlation matrix
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Scale Items</span>
                    <span className="text-xl font-bold text-slate-200 font-mono">
                      {result.cronbach.itemCount} items
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {result.sampleSize} respondent records
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Reliability Tier</span>
                    <span className={`text-xs font-bold block mt-1 ${
                      result.cronbach.alpha >= 0.8 ? 'text-emerald-400' : result.cronbach.alpha >= 0.7 ? 'text-cyan-400' : 'text-amber-400'
                    }`}>
                      {result.cronbach.interpretation}
                    </span>
                  </div>
                </div>

                {/* Item-Total Statistics Table */}
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Survey Item / Question</th>
                        <th className="px-3 py-2 font-medium">Item Mean</th>
                        <th className="px-3 py-2 font-medium">Item Std Dev</th>
                        <th className="px-3 py-2 font-medium">Corrected Item-Total Corr (r)</th>
                        <th className="px-3 py-2 font-medium">Alpha If Item Deleted (α₋ⱼ)</th>
                        <th className="px-3 py-2 font-medium">Diagnostic Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.cronbach.items.map((item) => {
                        const improves = item.alphaIfDeleted > result.cronbach!.alpha + 0.02;
                        const lowCorr = item.itemTotalCorr < 0.2;
                        return (
                          <tr key={item.item} className="hover:bg-surface-raised/30">
                            <td className="px-3 py-2 font-sans font-medium text-slate-200">{item.item}</td>
                            <td className="px-3 py-2 text-slate-300">{item.mean}</td>
                            <td className="px-3 py-2 text-slate-400">{item.stdDev}</td>
                            <td className="px-3 py-2">
                              <span className={lowCorr ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                {item.itemTotalCorr}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={improves ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                {item.alphaIfDeleted}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-sans text-[10px]">
                              {improves ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                                  Consider Deleting (Increases α to {item.alphaIfDeleted})
                                </span>
                              ) : lowCorr ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                                  Weak Correlation (r &lt; 0.2)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                                  Retain Item (Good Consistency)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

            {/* Tukey's HSD Post-Hoc Pairwise Matrix (ANOVA) */}
            {result.postHoc && result.postHoc.length > 0 && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Tukey's HSD Post-Hoc Pairwise Matrix (Tukey-Kramer Test)</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Family-wise Error Rate α = {result.alpha}
                  </span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Comparison (Group A vs Group B)</th>
                        <th className="px-3 py-2 font-medium">Mean Diff (A - B)</th>
                        <th className="px-3 py-2 font-medium">Std Error</th>
                        <th className="px-3 py-2 font-medium">Studentized Range (q)</th>
                        <th className="px-3 py-2 font-medium">Adjusted p-Value</th>
                        <th className="px-3 py-2 font-medium">95% Confidence Interval</th>
                        <th className="px-3 py-2 font-medium">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.postHoc.map((pair, idx) => (
                        <tr key={idx} className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200">
                            <span className="text-cyan-400 font-semibold">{pair.groupA}</span>
                            <span className="text-muted mx-1.5">vs</span>
                            <span className="text-slate-300 font-semibold">{pair.groupB}</span>
                          </td>
                          <td className="px-3 py-2 text-cyan-300 font-bold">
                            {pair.meanDiff > 0 ? `+${pair.meanDiff}` : pair.meanDiff}
                          </td>
                          <td className="px-3 py-2 text-slate-400">{pair.stdError}</td>
                          <td className="px-3 py-2 text-slate-300">{pair.qStat}</td>
                          <td className="px-3 py-2 text-slate-300">
                            {pair.pValue < 0.0001 ? '< 0.0001' : pair.pValue}
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            [{pair.ciLower}, {pair.ciUpper}]
                          </td>
                          <td className="px-3 py-2">
                            {pair.isSignificant ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-semibold">
                                Significant (p &lt; {result.alpha})
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

            {/* Two-Way Factorial ANOVA Card & Cell Means */}
            {result.twoWayAnova && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-primary" />
                      <span>Two-Way Factorial ANOVA Summary Table</span>
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      Type I / III Sequential Partition of Variance
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border font-medium">
                        <tr>
                          <th className="px-3 py-2">Source of Variation</th>
                          <th className="px-3 py-2 font-mono">SS</th>
                          <th className="px-3 py-2 font-mono">df</th>
                          <th className="px-3 py-2 font-mono">MS</th>
                          <th className="px-3 py-2 font-mono">F-Ratio</th>
                          <th className="px-3 py-2 font-mono">p-Value</th>
                          <th className="px-3 py-2 font-mono">Partial η²</th>
                          <th className="px-3 py-2 font-sans">Significance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {/* Factor A */}
                        <tr className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200">
                            Factor A: {result.twoWayAnova.factorAName}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.factorAEffects.ss}</td>
                          <td className="px-3 py-2 text-slate-400">{result.twoWayAnova.factorAEffects.df}</td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.factorAEffects.ms}</td>
                          <td className="px-3 py-2 font-bold text-cyan-300">{result.twoWayAnova.factorAEffects.fStat}</td>
                          <td className="px-3 py-2 text-slate-200">{result.twoWayAnova.factorAEffects.pVal < 0.0001 ? '< 0.0001' : result.twoWayAnova.factorAEffects.pVal}</td>
                          <td className="px-3 py-2 text-emerald-400 font-bold">{result.twoWayAnova.factorAEffects.partialEtaSq}</td>
                          <td className="px-3 py-2 font-sans">
                            {result.twoWayAnova.factorAEffects.isSignificant ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                Sig (p &lt; {result.alpha})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px]">
                                Not Sig
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Factor B */}
                        <tr className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-medium text-slate-200">
                            Factor B: {result.twoWayAnova.factorBName}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.factorBEffects.ss}</td>
                          <td className="px-3 py-2 text-slate-400">{result.twoWayAnova.factorBEffects.df}</td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.factorBEffects.ms}</td>
                          <td className="px-3 py-2 font-bold text-cyan-300">{result.twoWayAnova.factorBEffects.fStat}</td>
                          <td className="px-3 py-2 text-slate-200">{result.twoWayAnova.factorBEffects.pVal < 0.0001 ? '< 0.0001' : result.twoWayAnova.factorBEffects.pVal}</td>
                          <td className="px-3 py-2 text-emerald-400 font-bold">{result.twoWayAnova.factorBEffects.partialEtaSq}</td>
                          <td className="px-3 py-2 font-sans">
                            {result.twoWayAnova.factorBEffects.isSignificant ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                Sig (p &lt; {result.alpha})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px]">
                                Not Sig
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Interaction A x B */}
                        <tr className="hover:bg-surface-raised/30 bg-primary/5">
                          <td className="px-3 py-2 font-sans font-semibold text-cyan-300">
                            Interaction: {result.twoWayAnova.factorAName} × {result.twoWayAnova.factorBName}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.interactionEffects.ss}</td>
                          <td className="px-3 py-2 text-slate-400">{result.twoWayAnova.interactionEffects.df}</td>
                          <td className="px-3 py-2 text-slate-300">{result.twoWayAnova.interactionEffects.ms}</td>
                          <td className="px-3 py-2 font-bold text-cyan-300">{result.twoWayAnova.interactionEffects.fStat}</td>
                          <td className="px-3 py-2 text-slate-200">{result.twoWayAnova.interactionEffects.pVal < 0.0001 ? '< 0.0001' : result.twoWayAnova.interactionEffects.pVal}</td>
                          <td className="px-3 py-2 text-emerald-400 font-bold">{result.twoWayAnova.interactionEffects.partialEtaSq}</td>
                          <td className="px-3 py-2 font-sans">
                            {result.twoWayAnova.interactionEffects.isSignificant ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                Sig Interaction
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px]">
                                No Interaction
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Within Error */}
                        <tr className="hover:bg-surface-raised/30 text-slate-400">
                          <td className="px-3 py-2 font-sans">Within-Cell Residual Error</td>
                          <td className="px-3 py-2">{result.twoWayAnova.errorEffects.ss}</td>
                          <td className="px-3 py-2">{result.twoWayAnova.errorEffects.df}</td>
                          <td className="px-3 py-2">{result.twoWayAnova.errorEffects.ms}</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2 font-sans">—</td>
                        </tr>
                        {/* Total */}
                        <tr className="font-bold border-t border-border/80 bg-surface-raised/40">
                          <td className="px-3 py-2 font-sans text-slate-100">Total Variance</td>
                          <td className="px-3 py-2 text-slate-100">{result.twoWayAnova.totalEffects.ss}</td>
                          <td className="px-3 py-2 text-slate-100">{result.twoWayAnova.totalEffects.df}</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2 font-sans">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cell Means Table */}
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Factorial Sub-Group Cell Means ({result.twoWayAnova.factorAName} × {result.twoWayAnova.factorBName})</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                        <tr>
                          <th className="px-3 py-2">{result.twoWayAnova.factorAName}</th>
                          <th className="px-3 py-2">{result.twoWayAnova.factorBName}</th>
                          <th className="px-3 py-2 font-mono">Count (n)</th>
                          <th className="px-3 py-2 font-mono">Cell Mean (ȳ)</th>
                          <th className="px-3 py-2 font-mono">Cell Std Dev (s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {result.twoWayAnova.cellMeans.map((c, idx) => (
                          <tr key={idx} className="hover:bg-surface-raised/30">
                            <td className="px-3 py-2 font-sans font-medium text-slate-200">{c.factorA}</td>
                            <td className="px-3 py-2 font-sans text-slate-300">{c.factorB}</td>
                            <td className="px-3 py-2 text-slate-400">{c.count}</td>
                            <td className="px-3 py-2 font-bold text-cyan-300">{c.mean}</td>
                            <td className="px-3 py-2 text-slate-300">{c.stdDev}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Two-Sample F-Test for Equality of Variances Card */}
            {result.fTestVariance && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Two-Sample Variance Ratio Test (Homoscedasticity)</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    H₀: σ₁² / σ₂² = 1.0
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 1: {result.fTestVariance.group1Name}</span>
                    <span className="text-lg font-bold text-cyan-300">
                      s₁² = {result.fTestVariance.var1}
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      Std Dev: {result.fTestVariance.sd1} • n = {result.fTestVariance.n1}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 2: {result.fTestVariance.group2Name}</span>
                    <span className="text-lg font-bold text-slate-200">
                      s₂² = {result.fTestVariance.var2}
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      Std Dev: {result.fTestVariance.sd2} • n = {result.fTestVariance.n2}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Variance Ratio (F)</span>
                    <span className="text-lg font-bold text-emerald-400">
                      F = {result.fTestVariance.fRatio}
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      95% CI: [{result.fTestVariance.ciLower}, {result.fTestVariance.ciUpper}]
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised/40 border border-border text-xs flex items-center justify-between">
                  <span className="text-slate-300">
                    Equality of Variance Verdict:
                  </span>
                  <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                    result.fTestVariance.isEqualVariance
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {result.fTestVariance.isEqualVariance
                      ? '✓ Equal Variances (Homoscedastic - Student t-test valid)'
                      : '⚠ Unequal Variances (Heteroscedastic - Welch t-test required)'}
                  </span>
                </div>
              </div>
            )}

            {/* Chi-Square Goodness-of-Fit Card */}
            {result.chiSquareGof && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Goodness-of-Fit Category Breakdown (Observed vs Expected)</span>
                  </h4>
                  <span className="text-[10px] text-muted font-mono">
                    χ² = {result.chiSquareGof.chiSquare} • df = {result.chiSquareGof.df} • p = {result.chiSquareGof.pValue}
                  </span>
                </div>
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Category Level</th>
                        <th className="px-3 py-2 font-medium font-mono">Observed (O)</th>
                        <th className="px-3 py-2 font-medium font-mono">Expected (E)</th>
                        <th className="px-3 py-2 font-medium font-mono">Residual (O - E)</th>
                        <th className="px-3 py-2 font-medium font-mono">Std Residual ((O-E)/√E)</th>
                        <th className="px-3 py-2 font-medium font-sans">Divergence Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.chiSquareGof.categories.map((cat) => {
                        const isOver = cat.residual > 0;
                        const isExtreme = Math.abs(cat.stdResidual) > 2;
                        return (
                          <tr key={cat.category} className="hover:bg-surface-raised/30">
                            <td className="px-3 py-2 font-sans font-medium text-slate-200">{cat.category}</td>
                            <td className="px-3 py-2 font-bold text-slate-100">{cat.observed}</td>
                            <td className="px-3 py-2 text-slate-400">{cat.expected}</td>
                            <td className={`px-3 py-2 font-bold ${isOver ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {isOver ? `+${cat.residual}` : cat.residual}
                            </td>
                            <td className={`px-3 py-2 font-bold ${isExtreme ? 'text-rose-400' : 'text-slate-300'}`}>
                              {cat.stdResidual}
                            </td>
                            <td className="px-3 py-2 font-sans text-[10px]">
                              {isExtreme ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                                  Extreme Divergence (|z| &gt; 2)
                                </span>
                              ) : isOver ? (
                                <span className="text-emerald-400 font-medium">Over-represented</span>
                              ) : (
                                <span className="text-slate-400 font-medium">Under-represented</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* McNemar's Paired 2x2 Test Card */}
            {result.mcnemar && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 text-cyan-400" />
                    <span>McNemar Paired Binary Transition Matrix</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Discordant Odds Ratio = {result.mcnemar.oddsRatio}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border border-border font-mono">
                      <thead className="bg-surface-raised text-[10px] uppercase text-muted">
                        <tr>
                          <th className="p-2 border-r border-border">Before \ After</th>
                          <th className="p-2 border-r border-border text-emerald-300">After: Positive (1)</th>
                          <th className="p-2 text-slate-300">After: Negative (0)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="p-2 font-sans font-semibold text-emerald-300 border-r border-border bg-surface-raised/30">
                            Before: Positive (1)
                          </td>
                          <td className="p-2 bg-surface text-slate-200 border-r border-border">
                            {result.mcnemar.a} (Retained)
                          </td>
                          <td className="p-2 bg-amber-500/10 text-amber-400 font-bold">
                            {result.mcnemar.b} (Lost / Dropped)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-sans font-semibold text-slate-300 border-r border-border bg-surface-raised/30">
                            Before: Negative (0)
                          </td>
                          <td className="p-2 bg-emerald-500/10 text-emerald-400 font-bold border-r border-border">
                            {result.mcnemar.c} (New Gains)
                          </td>
                          <td className="p-2 bg-surface text-slate-200">
                            {result.mcnemar.d} (Unconverted)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">Discordant Pairs</span>
                      <span className="text-base font-bold text-cyan-400">
                        {result.mcnemar.b + result.mcnemar.c}
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5">Shifted subjects</span>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-[10px] text-muted block uppercase">Net Transition Gain</span>
                      <span className={`text-base font-bold ${result.mcnemar.c >= result.mcnemar.b ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.mcnemar.c - result.mcnemar.b > 0 ? '+' : ''}
                        {result.mcnemar.c - result.mcnemar.b}
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5">Gains minus losses</span>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border col-span-2">
                      <span className="text-[10px] text-muted block uppercase">Edwards χ² Statistic</span>
                      <span className="text-base font-bold text-slate-200">
                        χ² = {result.mcnemar.chiSquare} (p = {result.mcnemar.pValue})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Exact Binomial Test Card */}
            {result.binomial && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Exact Binomial Trial Evaluation</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Exact Clopper-Pearson 95% CI
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Observed Successes (k)</span>
                    <span className="text-lg font-bold text-cyan-300">
                      {result.binomial.successes} / {result.binomial.trials}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Sample Proportion (p̂)</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {(result.binomial.observedRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Benchmark (p₀)</span>
                    <span className="text-lg font-bold text-slate-200">
                      {(result.binomial.hypothesizedRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Clopper-Pearson 95% CI</span>
                    <span className="text-xs font-bold text-slate-300 mt-1 block">
                      [{(result.binomial.ciLower * 100).toFixed(2)}%, {(result.binomial.ciUpper * 100).toFixed(2)}%]
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Poisson Rate Comparison Card */}
            {result.poisson && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Poisson Event Rate Ratio &amp; Incidence Comparison</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Conditional Binomial Exact p = {result.poisson.pValue}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 1: {result.poisson.group1Name}</span>
                    <span className="text-lg font-bold text-cyan-300">
                      {result.poisson.rate1} / exposure
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      {result.poisson.events1} events in {result.poisson.exposure1} unit exposure
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Cohort 2: {result.poisson.group2Name}</span>
                    <span className="text-lg font-bold text-slate-200">
                      {result.poisson.rate2} / exposure
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      {result.poisson.events2} events in {result.poisson.exposure2} unit exposure
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Incidence Rate Ratio (IRR)</span>
                    <span className="text-lg font-bold text-emerald-400">
                      IRR = {result.poisson.rateRatio}
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      95% CI: [{result.poisson.ciLower}, {result.poisson.ciUpper}]
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PCA Dimension Reduction Card */}
            {result.pca && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Principal Component Analysis (PCA) Scree &amp; Eigenvectors</span>
                  </h4>
                  <span className="text-[10px] text-muted font-mono">
                    {result.pca.features.length} Features Analyzed
                  </span>
                </div>

                {/* Scree Table */}
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-medium">Principal Component</th>
                        <th className="px-3 py-2 font-medium font-mono">Eigenvalue (λ)</th>
                        <th className="px-3 py-2 font-medium font-mono">% Variance Explained</th>
                        <th className="px-3 py-2 font-medium font-mono">Cumulative % Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {result.pca.components.map((comp) => (
                        <tr key={comp.component} className="hover:bg-surface-raised/30">
                          <td className="px-3 py-2 font-sans font-semibold text-cyan-300">{comp.component}</td>
                          <td className="px-3 py-2 text-slate-200">{comp.eigenvalue}</td>
                          <td className="px-3 py-2 text-emerald-400 font-bold">{(comp.varianceExplained * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-slate-300">{(comp.cumulativeVariance * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Feature Loadings Matrix */}
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-300 uppercase mb-2">
                    Component Loadings Matrix (Feature Correlation with Principal Axes)
                  </h5>
                  <div className="overflow-x-auto border border-border/80 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-muted uppercase bg-surface-raised/40 border-b border-border font-medium">
                        <tr>
                          <th className="px-3 py-2">Feature</th>
                          <th className="px-3 py-2 font-mono">PC1 Loading</th>
                          <th className="px-3 py-2 font-mono">PC2 Loading</th>
                          {result.pca.features.length > 2 && <th className="px-3 py-2 font-mono">PC3 Loading</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {result.pca.features.map((feat) => {
                          const loads = result.pca!.loadings[feat] || [0, 0, 0];
                          return (
                            <tr key={feat} className="hover:bg-surface-raised/30">
                              <td className="px-3 py-2 font-sans font-medium text-slate-200">{feat}</td>
                              <td className="px-3 py-2 text-cyan-300 font-bold">{loads[0]}</td>
                              <td className="px-3 py-2 text-slate-300">{loads[1] ?? '—'}</td>
                              {result.pca!.features.length > 2 && (
                                <td className="px-3 py-2 text-slate-400">{loads[2] ?? '—'}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Dixon's Q-Test Card */}
            {result.dixonQ && (
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dixon's Q-Test for Extreme Value Outlier Detection</span>
                  </h4>
                  <span className="text-[10px] text-muted font-mono">
                    Rorabacher Critical Values (95% Confidence)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Suspect Value ({result.dixonQ.selectedTail})</span>
                    <span className="text-lg font-bold text-amber-300">
                      {result.dixonQ.selectedTail === 'max' ? result.dixonQ.suspectMax : result.dixonQ.suspectMin}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Calculated Q (Q_calc)</span>
                    <span className="text-lg font-bold text-cyan-300">
                      {result.dixonQ.qCalculated}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Critical Q (Q_crit, n={result.dixonQ.sampleSize})</span>
                    <span className="text-lg font-bold text-slate-200">
                      {result.dixonQ.qCritical}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-[10px] text-muted block uppercase">Outlier Rejection</span>
                    <span className={`text-base font-bold block mt-0.5 ${
                      result.dixonQ.isOutlierRejected ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {result.dixonQ.isOutlierRejected ? 'Reject (Outlier)' : 'Retain (Valid)'}
                    </span>
                  </div>
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
        initialTab="library"
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
        onOpenSamplingGuide={() => {
          setIsSamplingOpen(false);
          setIsGuideOpen(true);
        }}
      />
    </div>
  );
};
