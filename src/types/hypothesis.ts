export type HypothesisTestType =
  | 'welch_ttest'
  | 'one_sample_ttest'
  | 'paired_ttest'
  | 'one_way_anova'
  | 'chi_square'
  | 'correlation'
  | 'linear_regression'
  | 'mann_whitney';

export interface TestConfig {
  testType: HypothesisTestType;
  tableName: string;
  targetColumn: string;
  groupColumn?: string;
  secondaryColumn?: string;
  benchmarkValue?: number;
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
  tStat: number;
  pValue: number;
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
}
