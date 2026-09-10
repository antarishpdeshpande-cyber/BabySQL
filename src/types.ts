export interface ColumnMeta {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface TableMeta {
  name: string;
  rowCount: number;
  columns: ColumnMeta[];
}

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  timestamp: string;
  query: string;
}

export interface HistogramBin {
  binLabel: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  cumulativeCount?: number;
  cumulativePercentage?: number;
}

export interface DescriptiveStats {
  columnName: string;
  isNumeric: boolean;
  totalCount: number;
  validCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  // Numeric metrics
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  median?: number;
  variance?: number;
  stdDev?: number;
  stdError?: number;
  skewness?: number;
  kurtosis?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  histogram?: HistogramBin[];
  // Categorical metrics
  topValues?: { value: string; count: number; percentage: number }[];
}
