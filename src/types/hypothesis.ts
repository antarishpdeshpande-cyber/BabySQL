export type HypothesisTestType =
  | 'welch_ttest'
  | 'one_sample_ttest'
  | 'paired_ttest'
  | 'one_way_anova'
  | 'two_way_anova'
  | 'f_test_variance'
  | 'chi_square'
  | 'chi_square_gof'
  | 'mcnemar_test'
  | 'binomial_test'
  | 'poisson_test'
  | 'correlation'
  | 'linear_regression'
  | 'mann_whitney'
  | 'multiple_regression'
  | 'logistic_regression'
  | 'proportion_ztest'
  | 'kruskal_wallis'
  | 'wilcoxon_signed_rank'
  | 'spearman_correlation'
  | 'kmeans_clustering'
  | 'cronbach_alpha'
  | 'pca'
  | 'dixon_q_test';

export interface TestConfig {
  testType: HypothesisTestType;
  tableName: string;
  targetColumn: string;
  groupColumn?: string;
  secondaryColumn?: string; // Factor B for Two-Way ANOVA, Time 2 for paired/McNemar, Exposure/Time for Poisson
  predictorColumns?: string[]; // for Multiple Regression, PCA, Clustering, Cronbach's Alpha
  benchmarkValue?: number; // for One-Sample t-test, Binomial p0 (e.g. 0.5)
  successValue?: string | number;
  numClusters?: number; // for kmeans (e.g. 2, 3, 4, 5)
  alpha: number; // 0.01, 0.05, 0.10
  alternative: 'two-sided' | 'greater' | 'less';
}

export interface ExecutiveSummary {
  verdict: 'significant' | 'not_significant';
  headline: string;
  h0: string;
  ha: string;
  takeaway: string;
  effectSizeLabel?: string;
  confidenceInterval?: [number, number];
  ciLevel?: number; // e.g. 95
}

export interface TestMetric {
  name: string;
  value: string | number;
  description: string;
}

export interface GroupSummary {
  group: string;
  count: number;
  mean: number;
  stdDev: number;
  stdError: number;
  ciLower: number;
  ciUpper: number;
  median?: number;
  rankSum?: number;
}

export interface ContingencyData {
  rowLabels: string[];
  colLabels: string[];
  observed: number[][];
  expected: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export interface RegressionModelCoefficients {
  variable: string;
  estimate: number;
  stdError: number;
  tStat?: number;
  zStat?: number;
  pValue: number;
  vif?: number;
  oddsRatio?: number;
  ciLower?: number;
  ciUpper?: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface AssumptionDiagnostics {
  skewness: number;
  kurtosis: number;
  jarqueBeraStat: number;
  jarqueBeraPVal: number;
  isNormal: boolean;
  varianceRatio?: number;
  recommendation?: string;
}

export interface ProportionComparisonData {
  group1Name: string;
  group2Name: string;
  count1: number;
  total1: number;
  rate1: number;
  count2: number;
  total2: number;
  rate2: number;
  pooledRate: number;
  difference: number;
  liftPercent: number;
  ciLower: number;
  ciUpper: number;
}

export interface ClusterProfile {
  clusterId: number;
  name: string;
  size: number;
  percentage: number;
  centroid: Record<string, number>;
  wcss: number;
}

export interface ClusteringModelData {
  k: number;
  features: string[];
  clusters: ClusterProfile[];
  totalWcss: number;
  bcss: number;
  varianceExplained: number; // BCSS / TSS
  iterations: number;
}

export interface PostHocComparison {
  groupA: string;
  groupB: string;
  meanDiff: number;
  stdError: number;
  qStat: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  isSignificant: boolean;
}

export interface CronbachItemStats {
  item: string;
  mean: number;
  stdDev: number;
  itemTotalCorr: number;
  alphaIfDeleted: number;
}

export interface CronbachAlphaData {
  alpha: number;
  standardizedAlpha: number;
  itemCount: number;
  totalVariance: number;
  sumItemVariances: number;
  interpretation: string;
  items: CronbachItemStats[];
}

export interface RegressionDiagnostics {
  durbinWatson: number;
  durbinWatsonInterpretation: string;
  breuschPaganStat: number;
  breuschPaganPVal: number;
  isHomoscedastic: boolean;
}

// --- NEW DATA STRUCTURES FOR JSTAT SUITE ---

export interface TwoWayAnovaEffect {
  source: string;
  ss: number;
  df: number;
  ms: number;
  fStat: number;
  pVal: number;
  partialEtaSq: number;
  isSignificant: boolean;
}

export interface TwoWayCellMean {
  factorA: string;
  factorB: string;
  count: number;
  mean: number;
  stdDev: number;
}

export interface TwoWayAnovaData {
  factorAName: string;
  factorBName: string;
  factorAEffects: TwoWayAnovaEffect;
  factorBEffects: TwoWayAnovaEffect;
  interactionEffects: TwoWayAnovaEffect;
  errorEffects: { ss: number; df: number; ms: number };
  totalEffects: { ss: number; df: number };
  cellMeans: TwoWayCellMean[];
}

export interface FTestVarianceData {
  group1Name: string;
  group2Name: string;
  n1: number;
  n2: number;
  var1: number;
  var2: number;
  sd1: number;
  sd2: number;
  fRatio: number;
  df1: number;
  df2: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  isEqualVariance?: boolean;
}

export interface ChiSquareGofCategory {
  category: string;
  observed: number;
  expected: number;
  residual: number;
  stdResidual: number;
}

export interface ChiSquareGofData {
  categories: ChiSquareGofCategory[];
  chiSquare: number;
  df: number;
  pValue: number;
}

export interface McNemarData {
  beforeName: string;
  afterName: string;
  a: number; // Yes -> Yes
  b: number; // Yes -> No
  c: number; // No -> Yes
  d: number; // No -> No
  bothPositive?: number;
  beforePosAfterNeg?: number;
  beforeNegAfterPos?: number;
  bothNegative?: number;
  discordantPairs?: number;
  chiSquare: number;
  pValue: number;
  oddsRatio: number;
  isEdwardsCorrected: boolean;
}

export interface ExactBinomialData {
  successes: number;
  trials: number;
  hypothesizedRate: number;
  observedRate: number;
  proportion?: number;
  hypothesizedProb?: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
}

export interface PoissonTestData {
  group1Name: string;
  group2Name: string;
  events1: number;
  exposure1: number;
  rate1: number;
  events2: number;
  exposure2: number;
  rate2: number;
  rateRatio: number;
  ciLower: number;
  ciUpper: number;
  pValue: number;
}

export interface PcaComponent {
  component: string;
  eigenvalue: number;
  varianceExplained: number;
  cumulativeVariance: number;
}

export interface PcaData {
  features: string[];
  components: PcaComponent[];
  loadings: Record<string, number[]>;
  sampleProjections: { pc1: number; pc2: number }[];
}

export interface DixonQData {
  sampleSize: number;
  sortedValues: number[];
  suspectMin: number;
  suspectMax: number;
  qMin: number;
  qMax: number;
  selectedTail: 'min' | 'max';
  qCalculated: number;
  qCritical: number;
  isOutlierRejected: boolean;
}

export interface HypothesisTestResult {
  testType: HypothesisTestType;
  testName: string;
  tableName: string;
  timestamp: number;
  sampleSize: number;
  alpha: number;
  statisticName: string;
  testStatistic: number;
  pVal: number;
  degreesOfFreedom?: number | string;
  executiveSummary: ExecutiveSummary;
  metrics: TestMetric[];
  groupSummaries?: GroupSummary[];
  contingency?: ContingencyData;
  regressionCoefficients?: RegressionModelCoefficients[];
  scatterData?: { x: number; y: number }[];
  regressionLine?: { slope: number; intercept: number; r2: number };
  confusionMatrix?: ConfusionMatrix;
  diagnostics?: AssumptionDiagnostics;
  proportionData?: ProportionComparisonData;
  clustering?: ClusteringModelData;
  postHoc?: PostHocComparison[];
  cronbach?: CronbachAlphaData;
  regressionDiagnostics?: RegressionDiagnostics;
  twoWayAnova?: TwoWayAnovaData;
  fTestVariance?: FTestVarianceData;
  chiSquareGof?: ChiSquareGofData;
  mcnemar?: McNemarData;
  exactBinomial?: ExactBinomialData;
  binomial?: ExactBinomialData;
  poissonTest?: PoissonTestData;
  poisson?: PoissonTestData;
  pca?: PcaData;
  dixonQ?: DixonQData;
}
