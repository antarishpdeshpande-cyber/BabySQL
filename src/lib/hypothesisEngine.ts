import pkg from 'jstat';
import * as ss from 'simple-statistics';
import {
  HypothesisTestResult,
  TestConfig,
  GroupSummary,
  ContingencyData,
  RegressionModelCoefficients,
  AssumptionDiagnostics,
  ConfusionMatrix,
  ProportionComparisonData,
  ClusterProfile,
  ClusteringModelData,
} from '../types/hypothesis';

const jStat = (pkg as any).jStat || pkg;

// Matrix Algebra Utilities (Pure TypeScript, Zero external packages)
function matrixTranspose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const res: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      res[j][i] = A[i][j];
    }
  }
  return res;
}

function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const res: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const aVal = A[i][k];
      if (aVal === 0) continue;
      for (let j = 0; j < colsB; j++) {
        res[i][j] += aVal * B[k][j];
      }
    }
  }
  return res;
}

function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  const rows = A.length;
  const cols = v.length;
  const res = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      sum += A[i][j] * v[j];
    }
    res[i] = sum;
  }
  return res;
}

function matrixInverse(M: number[][]): number[][] | null {
  const n = M.length;
  const aug: number[][] = M.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null;

    if (maxRow !== col) {
      const temp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = temp;
    }

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

// Universal Rank Assignment with Tie-Averaging
function computeRanksWithTies(values: number[]): { ranks: number[]; ties: number[] } {
  const indexed = values.map((val, idx) => ({ val, idx, rank: 0 }));
  indexed.sort((a, b) => a.val - b.val);

  const ties: number[] = [];
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[i].val) {
      j++;
    }
    const tieCount = j - i + 1;
    if (tieCount > 1) {
      ties.push(tieCount);
    }
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      indexed[k].rank = avgRank;
    }
    i = j + 1;
  }

  const result = new Array(values.length);
  for (const item of indexed) {
    result[item.idx] = item.rank;
  }
  return { ranks: result, ties };
}

// Automated Statistical Assumption Diagnostics (Skewness, Kurtosis, Jarque-Bera)
export function computeDiagnostics(values: number[]): AssumptionDiagnostics {
  const n = values.length;
  if (n < 4) {
    return {
      skewness: 0,
      kurtosis: 0,
      jarqueBeraStat: 0,
      jarqueBeraPVal: 1,
      isNormal: true,
      recommendation: 'Sample size too small for distribution assumption testing.',
    };
  }

  const m = mean(values);
  const s = stdDev(values, m);
  if (s === 0) {
    return {
      skewness: 0,
      kurtosis: 0,
      jarqueBeraStat: 0,
      jarqueBeraPVal: 1,
      isNormal: true,
      recommendation: 'Constant values detected (zero variance).',
    };
  }

  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += Math.pow(d, 2);
    m3 += Math.pow(d, 3);
    m4 += Math.pow(d, 4);
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;

  const popS = Math.sqrt(m2);
  const skewness = popS > 0 ? Number((m3 / Math.pow(popS, 3)).toFixed(3)) : 0;
  const kurtosis = popS > 0 ? Number((m4 / Math.pow(popS, 4) - 3).toFixed(3)) : 0;

  // Jarque-Bera statistic: JB = (n/6) * (S^2 + K^2 / 4)
  const jb = Number(((n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4)).toFixed(3));
  let pVal = 1;
  try {
    pVal = Math.max(0, Math.min(1, 1 - jStat.chisquare.cdf(jb, 2)));
  } catch {
    pVal = jb > 5.991 ? 0.01 : 0.5;
  }

  const isNormal = pVal >= 0.05 && Math.abs(skewness) < 1.0;
  let recommendation = undefined;
  if (!isNormal) {
    if (Math.abs(skewness) >= 1.0) {
      recommendation = `Distribution is significantly skewed (${skewness > 0 ? '+' : ''}${skewness}). For 2 cohorts, consider the non-parametric Mann-Whitney U test; for 3+ cohorts, consider Kruskal-Wallis.`;
    } else {
      recommendation = `Distribution exhibits heavy tails (Kurtosis = ${kurtosis}, Jarque-Bera p = ${pVal.toFixed(4)}). Parametric t-tests remain robust when N ≥ 30 per Central Limit Theorem.`;
    }
  }

  return {
    skewness,
    kurtosis,
    jarqueBeraStat: jb,
    jarqueBeraPVal: Number(pVal.toFixed(4)),
    isNormal,
    recommendation,
  };
}

// Helper math utilities
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[], sampleMean?: number): number {
  if (arr.length < 2) return 0;
  const m = sampleMean !== undefined ? sampleMean : mean(arr);
  const sumSq = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0);
  return sumSq / (arr.length - 1);
}

function stdDev(arr: number[], sampleMean?: number): number {
  return Math.sqrt(variance(arr, sampleMean));
}

function getTCritical(alpha: number, df: number): number {
  if (df <= 0) return 1.96;
  try {
    return Math.abs(jStat.studentt.inv(1 - alpha / 2, df)) || 1.96;
  } catch {
    return 1.96;
  }
}

function classifyCohenD(d: number): string {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'Negligible effect';
  if (absD < 0.5) return 'Small effect';
  if (absD < 0.8) return 'Medium / Moderate effect';
  return 'Large effect';
}

function cleanNumericValues(values: any[]): number[] {
  return values
    .map((v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/[$,]/g, '').trim();
        if (cleaned === '') return null;
        const parsed = Number(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
    .filter((v): v is number => v !== null && !isNaN(v) && isFinite(v));
}

// 1. Two-Sample Independent / Welch's t-test
export function runWelchTTest(
  g1Values: number[],
  g2Values: number[],
  g1Name: string,
  g2Name: string,
  metricName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n1 = g1Values.length;
  const n2 = g2Values.length;

  if (n1 < 2 || n2 < 2) {
    throw new Error('Both groups must contain at least 2 valid numeric observations for a t-test.');
  }

  const m1 = mean(g1Values);
  const m2 = mean(g2Values);
  const v1 = variance(g1Values, m1);
  const v2 = variance(g2Values, m2);
  const s1 = Math.sqrt(v1);
  const s2 = Math.sqrt(v2);

  const se1 = s1 / Math.sqrt(n1);
  const se2 = s2 / Math.sqrt(n2);

  // Welch's standard error & degrees of freedom
  const seDiff = Math.sqrt(v1 / n1 + v2 / n2);
  const diff = m1 - m2;
  const tStat = seDiff > 0 ? diff / seDiff : 0;

  const numDf = Math.pow(v1 / n1 + v2 / n2, 2);
  const denDf = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const df = denDf > 0 ? numDf / denDf : n1 + n2 - 2;

  // Two-tailed p-value
  const tCdf = jStat.studentt.cdf(Math.abs(tStat), df);
  const pVal = Math.max(0, Math.min(1, 2 * (1 - tCdf)));

  // Pooled standard deviation for Cohen's d
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const pooledSd = Math.sqrt(pooledVar);
  const cohenD = pooledSd > 0 ? Math.abs(diff) / pooledSd : 0;
  const effectDesc = classifyCohenD(cohenD);

  // 95% Confidence Interval of difference
  const tCrit = getTCritical(alpha, df);
  const ciLower = diff - tCrit * seDiff;
  const ciUpper = diff + tCrit * seDiff;

  const isSignificant = pVal < alpha;
  const higherGroup = m1 >= m2 ? g1Name : g2Name;
  const lowerGroup = m1 >= m2 ? g2Name : g1Name;
  const absDiff = Math.abs(diff);
  const pctDiff = m2 !== 0 ? ((diff / m2) * 100).toFixed(1) : 'N/A';

  const groups: GroupSummary[] = [
    {
      group: g1Name,
      count: n1,
      mean: Number(m1.toFixed(3)),
      stdDev: Number(s1.toFixed(3)),
      stdError: Number(se1.toFixed(3)),
      ciLower: Number((m1 - getTCritical(alpha, n1 - 1) * se1).toFixed(3)),
      ciUpper: Number((m1 + getTCritical(alpha, n1 - 1) * se1).toFixed(3)),
    },
    {
      group: g2Name,
      count: n2,
      mean: Number(m2.toFixed(3)),
      stdDev: Number(s2.toFixed(3)),
      stdError: Number(se2.toFixed(3)),
      ciLower: Number((m2 - getTCritical(alpha, n2 - 1) * se2).toFixed(3)),
      ciUpper: Number((m2 + getTCritical(alpha, n2 - 1) * se2).toFixed(3)),
    },
  ];

  const takeaway = isSignificant
    ? `We reject the null hypothesis (p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant difference in ${metricName} between "${g1Name}" and "${g2Name}". Group "${higherGroup}" averages ${absDiff.toFixed(2)} higher than "${lowerGroup}" (${pctDiff}% difference), representing a ${effectDesc.toLowerCase()} (Cohen's d = ${cohenD.toFixed(2)}).`
    : `We fail to reject the null hypothesis (p = ${pVal.toFixed(4)} ≥ ${alpha}). The observed difference of ${absDiff.toFixed(2)} between "${g1Name}" and "${g2Name}" is not statistically significant and can likely be attributed to random sampling variation.`;

  return {
    testType: 'welch_ttest',
    testName: "Two-Sample Independent Welch's t-Test (A/B Test)",
    tableName,
    timestamp: Date.now(),
    sampleSize: n1 + n2,
    alpha,
    statisticName: 't',
    testStatistic: Number(tStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: Number(df.toFixed(1)),
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Statistically Significant Difference (p = ${pVal.toFixed(4)} < ${alpha})`
        : `No Significant Difference (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Mean ${metricName} for "${g1Name}" = Mean ${metricName} for "${g2Name}"`,
      ha: `Hₐ: Mean ${metricName} for "${g1Name}" ≠ Mean ${metricName} for "${g2Name}"`,
      takeaway,
      effectSizeLabel: `Cohen's d = ${cohenD.toFixed(2)} (${effectDesc})`,
      confidenceInterval: [Number(ciLower.toFixed(3)), Number(ciUpper.toFixed(3))],
      ciLevel: Math.round((1 - alpha) * 100),
    },
    metrics: [
      { name: 't-Statistic', value: Number(tStat.toFixed(3)), description: 'Difference scaled by standard error' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability of observing this difference under H₀' },
      { name: 'Degrees of Freedom (df)', value: Number(df.toFixed(1)), description: "Welch–Satterthwaite adjusted df" },
      { name: 'Difference of Means', value: Number(diff.toFixed(3)), description: `Mean(${g1Name}) - Mean(${g2Name})` },
      { name: `${Math.round((1 - alpha) * 100)}% CI of Difference`, value: `[${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]`, description: 'Range for true population difference' },
      { name: "Effect Size (Cohen's d)", value: `${cohenD.toFixed(2)} (${effectDesc})`, description: 'Standardized measure of magnitude' },
    ],
    groupSummaries: groups,
  };
}

// 2. One-Sample t-test
export function runOneSampleTTest(
  values: number[],
  benchmark: number,
  metricName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = values.length;
  if (n < 2) {
    throw new Error('At least 2 valid numeric observations are required for a one-sample t-test.');
  }

  const sm = mean(values);
  const s = stdDev(values, sm);
  const se = s / Math.sqrt(n);
  const df = n - 1;

  const diff = sm - benchmark;
  const tStat = se > 0 ? diff / se : 0;
  const tCdf = jStat.studentt.cdf(Math.abs(tStat), df);
  const pVal = Math.max(0, Math.min(1, 2 * (1 - tCdf)));

  const tCrit = getTCritical(alpha, df);
  const ciLower = sm - tCrit * se;
  const ciUpper = sm + tCrit * se;
  const cohenD = s > 0 ? Math.abs(diff) / s : 0;

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `The sample mean of ${sm.toFixed(2)} statistically significantly differs from the benchmark target of ${benchmark} (t = ${tStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). We are ${Math.round((1 - alpha) * 100)}% confident that the true population mean lies between ${ciLower.toFixed(2)} and ${ciUpper.toFixed(2)}.`
    : `The sample mean of ${sm.toFixed(2)} does not statistically significantly deviate from the benchmark target of ${benchmark} (t = ${tStat.toFixed(2)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The observed gap of ${Math.abs(diff).toFixed(2)} is consistent with normal random sampling variability.`;

  return {
    testType: 'one_sample_ttest',
    testName: 'One-Sample t-Test (Benchmark Comparison)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 't',
    testStatistic: Number(tStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Deviation from Benchmark (p = ${pVal.toFixed(4)} < ${alpha})`
        : `Consistent with Benchmark (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: True Population Mean of "${metricName}" = ${benchmark}`,
      ha: `Hₐ: True Population Mean of "${metricName}" ≠ ${benchmark}`,
      takeaway,
      effectSizeLabel: `Cohen's d = ${cohenD.toFixed(2)} (${classifyCohenD(cohenD)})`,
      confidenceInterval: [Number(ciLower.toFixed(3)), Number(ciUpper.toFixed(3))],
      ciLevel: Math.round((1 - alpha) * 100),
    },
    metrics: [
      { name: 'Sample Mean', value: Number(sm.toFixed(3)), description: `Average of ${metricName}` },
      { name: 'Benchmark Target', value: benchmark, description: 'Hypothesized population benchmark' },
      { name: 't-Statistic', value: Number(tStat.toFixed(3)), description: 'Standardized deviation from benchmark' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability under null hypothesis' },
      { name: 'Degrees of Freedom', value: df, description: 'n - 1' },
      { name: `${Math.round((1 - alpha) * 100)}% Confidence Interval`, value: `[${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]`, description: 'Estimated range for true mean' },
    ],
    groupSummaries: [
      {
        group: metricName,
        count: n,
        mean: Number(sm.toFixed(3)),
        stdDev: Number(s.toFixed(3)),
        stdError: Number(se.toFixed(3)),
        ciLower: Number(ciLower.toFixed(3)),
        ciUpper: Number(ciUpper.toFixed(3)),
      },
    ],
  };
}

// 3. Paired Samples t-test
export function runPairedTTest(
  val1: number[],
  val2: number[],
  name1: string,
  name2: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = Math.min(val1.length, val2.length);
  if (n < 2) {
    throw new Error('At least 2 paired observations are required for a paired t-test.');
  }

  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(val1[i] - val2[i]);
  }

  const meanDiff = mean(diffs);
  const sDiff = stdDev(diffs, meanDiff);
  const seDiff = sDiff / Math.sqrt(n);
  const df = n - 1;

  const tStat = seDiff > 0 ? meanDiff / seDiff : 0;
  const tCdf = jStat.studentt.cdf(Math.abs(tStat), df);
  const pVal = Math.max(0, Math.min(1, 2 * (1 - tCdf)));

  const tCrit = getTCritical(alpha, df);
  const ciLower = meanDiff - tCrit * seDiff;
  const ciUpper = meanDiff + tCrit * seDiff;
  const cohenD = sDiff > 0 ? Math.abs(meanDiff) / sDiff : 0;

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `There is a statistically significant change between "${name1}" and "${name2}" (t = ${tStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). On average, observations changed by ${meanDiff.toFixed(2)} (95% CI: [${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]).`
    : `The change between "${name1}" and "${name2}" is not statistically significant (p = ${pVal.toFixed(4)} ≥ ${alpha}). The average difference of ${meanDiff.toFixed(2)} could easily arise from chance.`;

  return {
    testType: 'paired_ttest',
    testName: 'Paired Samples t-Test (Repeated Measures)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 't',
    testStatistic: Number(tStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Paired Change (p = ${pVal.toFixed(4)} < ${alpha})`
        : `No Significant Paired Change (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Mean difference between "${name1}" and "${name2}" = 0`,
      ha: `Hₐ: Mean difference between "${name1}" and "${name2}" ≠ 0`,
      takeaway,
      effectSizeLabel: `Cohen's d_z = ${cohenD.toFixed(2)} (${classifyCohenD(cohenD)})`,
      confidenceInterval: [Number(ciLower.toFixed(3)), Number(ciUpper.toFixed(3))],
      ciLevel: Math.round((1 - alpha) * 100),
    },
    metrics: [
      { name: 'Mean Difference', value: Number(meanDiff.toFixed(3)), description: `Mean(${name1} - ${name2})` },
      { name: 't-Statistic', value: Number(tStat.toFixed(3)), description: 'Ratio of mean difference to standard error' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability of observing this change under H₀' },
      { name: 'Degrees of Freedom', value: df, description: 'n - 1' },
      { name: '95% CI of Difference', value: `[${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]`, description: 'Confidence bounds for true change' },
    ],
    groupSummaries: [
      {
        group: name1,
        count: n,
        mean: Number(mean(val1.slice(0, n)).toFixed(3)),
        stdDev: Number(stdDev(val1.slice(0, n)).toFixed(3)),
        stdError: Number((stdDev(val1.slice(0, n)) / Math.sqrt(n)).toFixed(3)),
        ciLower: 0,
        ciUpper: 0,
      },
      {
        group: name2,
        count: n,
        mean: Number(mean(val2.slice(0, n)).toFixed(3)),
        stdDev: Number(stdDev(val2.slice(0, n)).toFixed(3)),
        stdError: Number((stdDev(val2.slice(0, n)) / Math.sqrt(n)).toFixed(3)),
        ciLower: 0,
        ciUpper: 0,
      },
    ],
  };
}

// 4. One-Way ANOVA (F-test)
export function runOneWayAnova(
  groupsMap: Map<string, number[]>,
  targetName: string,
  groupName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const k = groupsMap.size;
  if (k < 3) {
    throw new Error('ANOVA requires at least 3 distinct categorical groups.');
  }

  let totalN = 0;
  let grandSum = 0;
  const groupStats: { group: string; count: number; mean: number; sum: number; values: number[] }[] = [];

  groupsMap.forEach((vals, name) => {
    if (vals.length > 0) {
      const sm = mean(vals);
      const s = vals.reduce((a, b) => a + b, 0);
      groupStats.push({ group: name, count: vals.length, mean: sm, sum: s, values: vals });
      totalN += vals.length;
      grandSum += s;
    }
  });

  if (totalN < k + 1) {
    throw new Error('Insufficient sample size across groups for ANOVA.');
  }

  const grandMean = grandSum / totalN;

  // Sum of Squares Between (SSB)
  let ssb = 0;
  for (const g of groupStats) {
    ssb += g.count * Math.pow(g.mean - grandMean, 2);
  }
  const dfBetween = k - 1;
  const msBetween = ssb / dfBetween;

  // Sum of Squares Within (SSW)
  let ssw = 0;
  for (const g of groupStats) {
    for (const v of g.values) {
      ssw += Math.pow(v - g.mean, 2);
    }
  }
  const dfWithin = totalN - k;
  const msWithin = dfWithin > 0 ? ssw / dfWithin : 0;

  const fStat = msWithin > 0 ? msBetween / msWithin : 0;
  const fCdf = jStat.centralF.cdf(fStat, dfBetween, dfWithin);
  const pVal = Math.max(0, Math.min(1, 1 - fCdf));

  // Effect size: Eta-squared
  const totalSs = ssb + ssw;
  const etaSquared = totalSs > 0 ? ssb / totalSs : 0;

  const sortedGroups = [...groupStats].sort((a, b) => b.mean - a.mean);
  const highestGroup = sortedGroups[0];
  const lowestGroup = sortedGroups[sortedGroups.length - 1];

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `There is a statistically significant difference in "${targetName}" across the ${k} groups of "${groupName}" (F = ${fStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). Factor "${groupName}" accounts for ${(etaSquared * 100).toFixed(1)}% of total variance (η² = ${etaSquared.toFixed(2)}). Highest group mean is "${highestGroup.group}" (${highestGroup.mean.toFixed(2)}) and lowest is "${lowestGroup.group}" (${lowestGroup.mean.toFixed(2)}).`
    : `No statistically significant difference in "${targetName}" was detected across the ${k} groups of "${groupName}" (F = ${fStat.toFixed(2)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The variation across groups is consistent with within-group random error.`;

  const summaries: GroupSummary[] = groupStats.map((g) => {
    const s = stdDev(g.values, g.mean);
    const se = s / Math.sqrt(g.count);
    const tc = getTCritical(alpha, g.count - 1);
    return {
      group: g.group,
      count: g.count,
      mean: Number(g.mean.toFixed(3)),
      stdDev: Number(s.toFixed(3)),
      stdError: Number(se.toFixed(3)),
      ciLower: Number((g.mean - tc * se).toFixed(3)),
      ciUpper: Number((g.mean + tc * se).toFixed(3)),
    };
  });

  return {
    testType: 'one_way_anova',
    testName: 'One-Way Analysis of Variance (ANOVA)',
    tableName,
    timestamp: Date.now(),
    sampleSize: totalN,
    alpha,
    statisticName: 'F',
    testStatistic: Number(fStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: `${dfBetween}, ${dfWithin}`,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Difference Across Groups (p = ${pVal.toFixed(4)} < ${alpha})`
        : `No Significant Group Difference (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Population means of all ${k} groups are equal`,
      ha: `Hₐ: At least one group mean is statistically different`,
      takeaway,
      effectSizeLabel: `η² (Eta-Squared) = ${etaSquared.toFixed(3)} (${(etaSquared * 100).toFixed(1)}% variance explained)`,
    },
    metrics: [
      { name: 'F-Statistic', value: Number(fStat.toFixed(3)), description: 'Ratio of between-group variance to within-group variance' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability under equal group means' },
      { name: 'Degrees of Freedom (Between, Within)', value: `${dfBetween}, ${dfWithin}`, description: 'k - 1, N - k' },
      { name: 'Between-Group Sum of Squares (SSB)', value: Number(ssb.toFixed(2)), description: 'Variance explained by grouping' },
      { name: 'Within-Group Sum of Squares (SSW)', value: Number(ssw.toFixed(2)), description: 'Unexplained residual variance' },
      { name: 'Eta-Squared (η²)', value: Number(etaSquared.toFixed(3)), description: 'Proportion of variance explained' },
    ],
    groupSummaries: summaries,
  };
}

// 5. Chi-Square Test of Independence
export function runChiSquareTest(
  rowValues: any[],
  colValues: any[],
  rowName: string,
  colName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = Math.min(rowValues.length, colValues.length);
  if (n < 5) {
    throw new Error('Chi-Square test requires at least 5 observations.');
  }

  // Find unique categories
  const rowLabels = Array.from(new Set(rowValues.map((v) => String(v ?? 'NULL')))).sort();
  const colLabels = Array.from(new Set(colValues.map((v) => String(v ?? 'NULL')))).sort();

  const r = rowLabels.length;
  const c = colLabels.length;

  if (r < 2 || c < 2) {
    throw new Error('Both variables must have at least 2 distinct categories for Chi-Square independence testing.');
  }

  // Contingency matrix
  const observed: number[][] = Array.from({ length: r }, () => Array(c).fill(0));
  for (let i = 0; i < n; i++) {
    const ri = rowLabels.indexOf(String(rowValues[i] ?? 'NULL'));
    const ci = colLabels.indexOf(String(colValues[i] ?? 'NULL'));
    if (ri !== -1 && ci !== -1) {
      observed[ri][ci]++;
    }
  }

  const rowTotals: number[] = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = Array(c).fill(0);
  for (let j = 0; j < c; j++) {
    for (let i = 0; i < r; i++) {
      colTotals[j] += observed[i][j];
    }
  }
  const grandTotal = n;

  // Expected frequencies & Chi-square calculation
  const expected: number[][] = Array.from({ length: r }, () => Array(c).fill(0));
  let chi2 = 0;
  let lowExpectedCount = 0;

  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const exp = (rowTotals[i] * colTotals[j]) / grandTotal;
      expected[i][j] = Number(exp.toFixed(2));
      if (exp < 5) lowExpectedCount++;
      if (exp > 0) {
        chi2 += Math.pow(observed[i][j] - exp, 2) / exp;
      }
    }
  }

  const df = (r - 1) * (c - 1);
  const chiCdf = jStat.chisquare.cdf(chi2, df);
  const pVal = Math.max(0, Math.min(1, 1 - chiCdf));

  // Cramér's V
  const minDim = Math.min(r - 1, c - 1);
  const cramersV = minDim > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `We reject the null hypothesis of independence (χ² = ${chi2.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant association between "${rowName}" and "${colName}". The strength of association is Cramér's V = ${cramersV.toFixed(2)}${lowExpectedCount > 0 ? ` (Note: ${lowExpectedCount} cells have expected count < 5)` : ''}.`
    : `Fail to reject the null hypothesis (χ² = ${chi2.toFixed(2)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). There is insufficient statistical evidence of an association between "${rowName}" and "${colName}".`;

  const contingency: ContingencyData = {
    rowLabels,
    colLabels,
    observed,
    expected,
    rowTotals,
    colTotals,
    grandTotal,
  };

  return {
    testType: 'chi_square',
    testName: 'Chi-Square Test of Independence (χ²)',
    tableName,
    timestamp: Date.now(),
    sampleSize: grandTotal,
    alpha,
    statisticName: 'χ²',
    testStatistic: Number(chi2.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Association (p = ${pVal.toFixed(4)} < ${alpha})`
        : `Independent / No Significant Association (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: "${rowName}" and "${colName}" are independent`,
      ha: `Hₐ: "${rowName}" and "${colName}" are significantly dependent / associated`,
      takeaway,
      effectSizeLabel: `Cramér's V = ${cramersV.toFixed(3)} (${cramersV < 0.1 ? 'Negligible' : cramersV < 0.3 ? 'Moderate' : 'Strong'} association)`,
    },
    metrics: [
      { name: 'Chi-Square (χ²)', value: Number(chi2.toFixed(3)), description: 'Sum of squared standardized residuals' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability under independence assumption' },
      { name: 'Degrees of Freedom', value: df, description: '(r - 1) × (c - 1)' },
      { name: "Cramér's V", value: Number(cramersV.toFixed(3)), description: 'Measure of categorical association strength (0 to 1)' },
      { name: 'Grid Size', value: `${r} rows × ${c} columns`, description: 'Contingency table dimensions' },
      { name: 'Cells with E < 5', value: lowExpectedCount, description: 'Cells where expected frequency < 5 (Cochran check)' },
    ],
    contingency,
  };
}

// 6. Pearson & Spearman Correlation
export function runCorrelationTest(
  xVals: number[],
  yVals: number[],
  xName: string,
  yName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = Math.min(xVals.length, yVals.length);
  if (n < 3) {
    throw new Error('Correlation test requires at least 3 paired numeric observations.');
  }

  const xClean = xVals.slice(0, n);
  const yClean = yVals.slice(0, n);

  const r = ss.sampleCorrelation(xClean, yClean);
  const df = n - 2;

  // t-statistic for Pearson correlation
  const tStat = Math.abs(r) < 1 ? (r * Math.sqrt(df)) / Math.sqrt(1 - Math.pow(r, 2)) : 999;
  const tCdf = jStat.studentt.cdf(Math.abs(tStat), df);
  const pVal = Math.max(0, Math.min(1, 2 * (1 - tCdf)));

  const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'neutral';
  const absR = Math.abs(r);
  const strength = absR < 0.2 ? 'negligible' : absR < 0.4 ? 'weak' : absR < 0.7 ? 'moderate' : 'strong';

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `Statistically significant ${strength} ${direction} correlation between "${xName}" and "${yName}" (r = ${r.toFixed(3)}, p = ${pVal.toFixed(4)} < ${alpha}). Approximately ${(Math.pow(r, 2) * 100).toFixed(1)}% of variance in "${yName}" is associated with "${xName}".`
    : `No statistically significant correlation found between "${xName}" and "${yName}" (r = ${r.toFixed(3)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). Any apparent pattern can be attributed to random noise.`;

  const scatterData = xClean.map((x, i) => ({ x, y: yClean[i] }));

  return {
    testType: 'correlation',
    testName: 'Pearson Correlation Significance Test',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'r',
    testStatistic: Number(r.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant ${strength.toUpperCase()} ${direction.toUpperCase()} Correlation (r = ${r.toFixed(3)}, p = ${pVal.toFixed(4)})`
        : `No Significant Correlation (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Population correlation coefficient ρ = 0 (No linear correlation)`,
      ha: `Hₐ: Population correlation coefficient ρ ≠ 0`,
      takeaway,
      effectSizeLabel: `r² = ${Math.pow(r, 2).toFixed(3)} (${(Math.pow(r, 2) * 100).toFixed(1)}% variance shared)`,
    },
    metrics: [
      { name: 'Correlation Coefficient (r)', value: Number(r.toFixed(3)), description: 'Degree of linear relationship (-1 to +1)' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Significance under H₀: ρ = 0' },
      { name: 't-Statistic', value: Number(tStat.toFixed(3)), description: 't = r × sqrt((n-2)/(1-r²))' },
      { name: 'Degrees of Freedom', value: df, description: 'n - 2' },
      { name: 'R-Squared (r²)', value: Number(Math.pow(r, 2).toFixed(3)), description: 'Proportion of shared variance' },
    ],
    scatterData,
  };
}

// 7. Ordinary Least Squares (OLS) Linear Regression
export function runLinearRegression(
  xVals: number[],
  yVals: number[],
  xName: string,
  yName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = Math.min(xVals.length, yVals.length);
  if (n < 3) {
    throw new Error('Linear regression requires at least 3 paired numeric observations.');
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    pairs.push([xVals[i], yVals[i]]);
  }

  const model = ss.linearRegression(pairs);
  const slope = model.m;
  const intercept = model.b;

  const yMean = mean(pairs.map((p) => p[1]));
  const xMean = mean(pairs.map((p) => p[0]));

  let ssTot = 0;
  let ssReg = 0;
  let ssRes = 0;
  let sxx = 0;

  for (const [x, y] of pairs) {
    const yHat = slope * x + intercept;
    ssTot += Math.pow(y - yMean, 2);
    ssReg += Math.pow(yHat - yMean, 2);
    ssRes += Math.pow(y - yHat, 2);
    sxx += Math.pow(x - xMean, 2);
  }

  const dfReg = 1;
  const dfRes = n - 2;
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - 2);

  const seResidual = dfRes > 0 ? Math.sqrt(ssRes / dfRes) : 0;
  const seSlope = sxx > 0 ? seResidual / Math.sqrt(sxx) : 0;
  const tSlope = seSlope > 0 ? slope / seSlope : 0;
  const pSlope = 2 * (1 - jStat.studentt.cdf(Math.abs(tSlope), dfRes));

  const seIntercept = sxx > 0 ? seResidual * Math.sqrt(1 / n + Math.pow(xMean, 2) / sxx) : 0;
  const tIntercept = seIntercept > 0 ? intercept / seIntercept : 0;
  const pIntercept = 2 * (1 - jStat.studentt.cdf(Math.abs(tIntercept), dfRes));

  const msReg = ssReg / dfReg;
  const msRes = dfRes > 0 ? ssRes / dfRes : 0;
  const fStat = msRes > 0 ? msReg / msRes : 0;
  const fCdf = jStat.centralF.cdf(fStat, dfReg, dfRes);
  const pVal = Math.max(0, Math.min(1, 1 - fCdf));

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `The regression model is statistically significant (F = ${fStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}), explaining ${(r2 * 100).toFixed(1)}% of the variance in "${yName}" (R² = ${r2.toFixed(3)}). For every 1-unit increase in "${xName}", "${yName}" is estimated to change by ${slope.toFixed(3)} (p = ${pSlope.toFixed(4)}).`
    : `The linear regression model is not statistically significant (p = ${pVal.toFixed(4)} ≥ ${alpha}). "${xName}" does not reliably predict "${yName}".`;

  const coefficients: RegressionModelCoefficients[] = [
    {
      variable: 'Intercept (β₀)',
      estimate: Number(intercept.toFixed(3)),
      stdError: Number(seIntercept.toFixed(3)),
      tStat: Number(tIntercept.toFixed(3)),
      pValue: Number(pIntercept.toFixed(4)),
    },
    {
      variable: `${xName} (β₁)`,
      estimate: Number(slope.toFixed(3)),
      stdError: Number(seSlope.toFixed(3)),
      tStat: Number(tSlope.toFixed(3)),
      pValue: Number(pSlope.toFixed(4)),
    },
  ];

  const scatterData = pairs.map(([x, y]) => ({ x, y }));

  return {
    testType: 'linear_regression',
    testName: 'Ordinary Least Squares (OLS) Linear Regression',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'F',
    testStatistic: Number(fStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: `${dfReg}, ${dfRes}`,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Predictive Model (R² = ${r2.toFixed(3)}, p = ${pVal.toFixed(4)})`
        : `Model Not Significant (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Slope β₁ = 0 (No linear predictive power)`,
      ha: `Hₐ: Slope β₁ ≠ 0 ("${xName}" significantly predicts "${yName}")`,
      takeaway,
      effectSizeLabel: `R² = ${r2.toFixed(3)} | Model Equation: ${yName} = ${intercept.toFixed(2)} + ${slope.toFixed(2)} × ${xName}`,
    },
    metrics: [
      { name: 'R-Squared (R²)', value: Number(r2.toFixed(3)), description: 'Proportion of variance explained by model' },
      { name: 'Adjusted R-Squared', value: Number(adjR2.toFixed(3)), description: 'R² penalized for number of predictors' },
      { name: 'Model F-Statistic', value: Number(fStat.toFixed(3)), description: 'Overall model significance test' },
      { name: 'Model p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Probability that R² is due to chance' },
      { name: 'Residual Standard Error', value: Number(seResidual.toFixed(3)), description: 'Standard deviation of residuals' },
      { name: 'Degrees of Freedom', value: `${dfReg}, ${dfRes}`, description: 'Predictor df, Residual df' },
    ],
    regressionCoefficients: coefficients,
    scatterData,
    regressionLine: { slope, intercept, r2 },
  };
}

// 8. Mann-Whitney U Test (Non-Parametric)
export function runMannWhitneyUTest(
  g1Values: number[],
  g2Values: number[],
  g1Name: string,
  g2Name: string,
  metricName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n1 = g1Values.length;
  const n2 = g2Values.length;

  if (n1 < 2 || n2 < 2) {
    throw new Error('Mann-Whitney test requires at least 2 observations in each group.');
  }

  // Combine and rank
  const combined = [
    ...g1Values.map((v) => ({ val: v, group: 1 })),
    ...g2Values.map((v) => ({ val: v, group: 2 })),
  ];

  const { ranks, ties } = computeRanksWithTies(combined.map((c) => c.val));

  let r1 = 0;
  let r2 = 0;
  for (let i = 0; i < combined.length; i++) {
    if (combined[i].group === 1) r1 += ranks[i];
    else r2 += ranks[i];
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = r2 - (n2 * (n2 + 1)) / 2;
  const u = Math.min(u1, u2);

  // Large-sample normal approximation for U with tie correction
  const meanU = (n1 * n2) / 2;
  const n = n1 + n2;
  let tieSum = 0;
  for (const t of ties) {
    tieSum += (t * t * t - t);
  }

  const varU = (n1 * n2 / 12) * ((n + 1) - tieSum / (n * (n - 1)));
  const stdU = Math.sqrt(Math.max(0, varU));
  const z = stdU > 0 ? (u - meanU) / stdU : 0;
  const pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1))));

  const med1 = ss.median(g1Values);
  const med2 = ss.median(g2Values);

  const isSignificant = pVal < alpha;
  const takeaway = isSignificant
    ? `We reject the null hypothesis (U = ${u}, Z = ${z.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant difference in the rank distribution of "${metricName}" between "${g1Name}" (median = ${med1}) and "${g2Name}" (median = ${med2}).`
    : `Fail to reject the null hypothesis (U = ${u}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The distribution of ranks between "${g1Name}" and "${g2Name}" does not significantly differ.`;

  return {
    testType: 'mann_whitney',
    testName: 'Mann-Whitney U Test (Wilcoxon Rank-Sum Non-Parametric)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n1 + n2,
    alpha,
    statisticName: 'U',
    testStatistic: u,
    pVal: Number(pVal.toFixed(5)),
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Rank Difference (U = ${u}, p = ${pVal.toFixed(4)})`
        : `No Significant Rank Difference (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Distribution of "${metricName}" is identical across "${g1Name}" and "${g2Name}"`,
      ha: `Hₐ: Distributions of "${metricName}" are significantly shifted between groups`,
      takeaway,
      effectSizeLabel: `Rank biserial correlation r = ${(1 - (2 * u) / (n1 * n2)).toFixed(2)}`,
    },
    metrics: [
      { name: 'U-Statistic', value: u, description: 'Minimum number of rank inversions between groups' },
      { name: 'Z-Score (Standardized)', value: Number(z.toFixed(3)), description: 'Large sample asymptotic standard normal test' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Two-tailed probability under null hypothesis' },
      { name: `Group "${g1Name}" Median`, value: med1, description: 'Non-parametric central tendency for group 1' },
      { name: `Group "${g2Name}" Median`, value: med2, description: 'Non-parametric central tendency for group 2' },
      { name: 'Total Ranked Observations', value: n1 + n2, description: 'Combined sample count' },
    ],
  };
}

// 9. Multiple Linear Regression (Multivariate OLS with VIF & Model F-Test)
export function runMultipleLinearRegression(
  xMatrix: number[][],
  yVector: number[],
  predictorNames: string[],
  targetName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = yVector.length;
  const k = predictorNames.length;

  if (n < k + 2) {
    throw new Error(`Multiple regression requires at least ${k + 2} observations for ${k} predictors (received: ${n}).`);
  }

  // Construct design matrix X with column of 1s for intercept
  const X: number[][] = xMatrix.map((row) => [1, ...row]);
  const p = k + 1; // number of parameters including intercept

  const XT = matrixTranspose(X);
  const XTX = matrixMultiply(XT, X);
  const invXTX = matrixInverse(XTX);

  if (!invXTX) {
    throw new Error('Multicollinearity error: Predictor variables are perfectly collinear (design matrix X^T X is singular).');
  }

  const XTY = matrixVectorMultiply(XT, yVector);
  const beta = matrixVectorMultiply(invXTX, XTY);

  // Predictions and residuals
  const yPred: number[] = [];
  const residuals: number[] = [];
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let j = 0; j < p; j++) {
      pred += X[i][j] * beta[j];
    }
    yPred.push(pred);
    const err = yVector[i] - pred;
    residuals.push(err);
    ssr += err * err;
  }

  const yMean = mean(yVector);
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const diff = yVector[i] - yMean;
    sst += diff * diff;
  }

  if (sst === 0) {
    throw new Error(`Target column "${targetName}" has zero variance.`);
  }

  const sse = Math.max(0, sst - ssr);
  const r2 = Math.max(0, Math.min(1, 1 - ssr / sst));
  const dfModel = k;
  const dfResid = n - p;

  const adjR2 = Math.max(0, 1 - (1 - r2) * ((n - 1) / dfResid));
  const residualVariance = ssr / dfResid;
  const rse = Math.sqrt(residualVariance);

  // Overall Model F-Statistic
  const msModel = sse / dfModel;
  const msResid = residualVariance;
  const fStat = msResid > 0 ? msModel / msResid : 0;
  let fPVal = 1;
  try {
    fPVal = Math.max(0, Math.min(1, 1 - jStat.centralF.cdf(fStat, dfModel, dfResid)));
  } catch {
    fPVal = fStat > 4 ? 0.001 : 0.5;
  }

  // Calculate VIF for each predictor
  const vifs: number[] = [];
  for (let j = 0; j < k; j++) {
    if (k === 1) {
      vifs.push(1.0);
    } else {
      // Regress predictor j on other predictors
      const yAux = xMatrix.map((r) => r[j]);
      const xAux = xMatrix.map((r) => r.filter((_, idx) => idx !== j));
      try {
        const auxRes = runMultipleLinearRegression(
          xAux,
          yAux,
          predictorNames.filter((_, idx) => idx !== j),
          predictorNames[j],
          tableName,
          alpha
        );
        const auxR2 = Number(auxRes.metrics.find((m) => m.name === 'R-Squared (R²)')?.value || 0);
        const vif = 1 / Math.max(1e-4, 1 - auxR2);
        vifs.push(Number(Math.min(999, vif).toFixed(2)));
      } catch {
        vifs.push(1.0);
      }
    }
  }

  // Coefficients details
  const coefficients: RegressionModelCoefficients[] = [];
  for (let j = 0; j < p; j++) {
    const varName = j === 0 ? 'Intercept (β₀)' : predictorNames[j - 1];
    const est = beta[j];
    const varBeta = Math.max(0, residualVariance * invXTX[j][j]);
    const se = Math.sqrt(varBeta);
    const tVal = se > 0 ? est / se : 0;
    let pVal = 1;
    try {
      pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(tVal), dfResid))));
    } catch {
      pVal = Math.abs(tVal) > 2 ? 0.05 : 0.5;
    }

    coefficients.push({
      variable: varName,
      estimate: Number(est.toFixed(4)),
      stdError: Number(se.toFixed(4)),
      tStat: Number(tVal.toFixed(3)),
      pValue: Number(pVal.toFixed(4)),
      vif: j === 0 ? undefined : vifs[j - 1],
    });
  }

  const isSignificant = fPVal < alpha;
  const highVifCount = vifs.filter((v) => v > 5).length;
  const sigPredictors = coefficients.filter((c, idx) => idx > 0 && c.pValue < alpha).map((c) => c.variable);

  let takeaway = isSignificant
    ? `The overall model is statistically significant (F(${dfModel}, ${dfResid}) = ${fStat.toFixed(2)}, p = ${fPVal.toFixed(4)} < ${alpha}). The combined predictors explain ${(r2 * 100).toFixed(1)}% of variance (Adj R² = ${(adjR2 * 100).toFixed(1)}%) in "${targetName}".`
    : `The overall model is not statistically significant (F = ${fStat.toFixed(2)}, p = ${fPVal.toFixed(4)} ≥ ${alpha}). The predictors do not explain a meaningful proportion of variance in "${targetName}".`;

  if (sigPredictors.length > 0) {
    takeaway += ` Statistically significant independent drivers: ${sigPredictors.join(', ')}.`;
  }
  if (highVifCount > 0) {
    takeaway += ` ⚠️ Multicollinearity warning: ${highVifCount} predictor(s) have VIF > 5. Consider pruning redundant collinear variables.`;
  }

  return {
    testType: 'multiple_regression',
    testName: 'Multiple Linear Regression (Multivariate OLS)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'F',
    testStatistic: Number(fStat.toFixed(3)),
    pVal: Number(fPVal.toFixed(5)),
    degreesOfFreedom: `${dfModel}, ${dfResid}`,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Multivariate Model (R² = ${r2.toFixed(3)}, F = ${fStat.toFixed(2)}, p = ${fPVal.toFixed(4)})`
        : `Non-Significant Model (p = ${fPVal.toFixed(4)} ≥ ${alpha})`,
      h0: 'H₀: All slope coefficients β₁ = β₂ = ... = βₖ = 0 (No relationship)',
      ha: 'Hₐ: At least one predictor coefficient βⱼ ≠ 0',
      takeaway,
      effectSizeLabel: `R² = ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}% variance explained)`,
    },
    regressionCoefficients: coefficients,
    metrics: [
      { name: 'R-Squared (R²)', value: Number(r2.toFixed(4)), description: 'Proportion of total variance explained by the model' },
      { name: 'Adjusted R²', value: Number(adjR2.toFixed(4)), description: 'Penalized R² adjusted for number of predictors' },
      { name: 'Model F-Statistic', value: Number(fStat.toFixed(3)), description: 'Ratio of explained variance to unexplained residual variance' },
      { name: 'Model p-Value', value: fPVal < 0.0001 ? '< 0.0001' : Number(fPVal.toFixed(4)), description: 'Overall model significance test' },
      { name: 'Residual Std Error', value: Number(rse.toFixed(4)), description: 'Typical size of prediction residuals (s)' },
      { name: 'Degrees of Freedom', value: `${dfModel} (Model), ${dfResid} (Residuals)`, description: 'Numerator and denominator degrees of freedom' },
    ],
  };
}

// 10. Binary Logistic Regression (Logit with IRLS, Odds Ratios & Confusion Matrix)
export function runLogisticRegression(
  xMatrix: number[][],
  yVector: number[],
  predictorNames: string[],
  targetName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = yVector.length;
  const k = predictorNames.length;

  if (n < k + 5) {
    throw new Error(`Logistic regression requires at least ${k + 5} observations.`);
  }

  // Check binary target
  const uniqueY = Array.from(new Set(yVector));
  if (uniqueY.length !== 2 || !uniqueY.includes(0) || !uniqueY.includes(1)) {
    throw new Error(`Target variable "${targetName}" must be binary (containing exactly values 0 and 1).`);
  }

  const X: number[][] = xMatrix.map((row) => [1, ...row]);
  const p = k + 1;

  // Initialize beta: intercept = log-odds of mean Y, slopes = 0
  const yMean = mean(yVector);
  const clampedMean = Math.max(0.01, Math.min(0.99, yMean));
  const beta = new Array(p).fill(0);
  beta[0] = Math.log(clampedMean / (1 - clampedMean));

  // Newton-Raphson / IRLS
  const maxIter = 30;
  let converged = false;
  let invHessian: number[][] | null = null;

  for (let iter = 0; iter < maxIter; iter++) {
    // Probabilities p_i and weights w_i
    const probs: number[] = [];
    const weights: number[] = [];
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let j = 0; j < p; j++) z += X[i][j] * beta[j];
      z = Math.max(-30, Math.min(30, z));
      const pi = 1 / (1 + Math.exp(-z));
      probs.push(pi);
      weights.push(Math.max(1e-7, pi * (1 - pi)));
    }

    // Gradient g = X^T (y - p)
    const g = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += X[i][j] * (yVector[i] - probs[i]);
      }
      g[j] = sum;
    }

    // Hessian H = X^T W X
    const H: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let j = 0; j < p; j++) {
      for (let l = 0; l < p; l++) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += X[i][j] * X[i][l] * weights[i];
        }
        H[j][l] = sum;
        if (j === l) H[j][l] += 1e-6; // Ridge regularization for numerical stability
      }
    }

    invHessian = matrixInverse(H);
    if (!invHessian) break;

    const delta = matrixVectorMultiply(invHessian, g);
    let maxDelta = 0;
    for (let j = 0; j < p; j++) {
      beta[j] += delta[j];
      maxDelta = Math.max(maxDelta, Math.abs(delta[j]));
    }

    if (maxDelta < 1e-5) {
      converged = true;
      break;
    }
  }

  // Final probabilities, log-likelihood, and confusion matrix
  let logLik = 0;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const finalProbs: number[] = [];

  for (let i = 0; i < n; i++) {
    let z = 0;
    for (let j = 0; j < p; j++) z += X[i][j] * beta[j];
    z = Math.max(-30, Math.min(30, z));
    const pi = 1 / (1 + Math.exp(-z));
    finalProbs.push(pi);

    const safeP = Math.max(1e-12, Math.min(1 - 1e-12, pi));
    logLik += yVector[i] * Math.log(safeP) + (1 - yVector[i]) * Math.log(1 - safeP);

    const predictedClass = pi >= 0.5 ? 1 : 0;
    if (yVector[i] === 1 && predictedClass === 1) tp++;
    else if (yVector[i] === 0 && predictedClass === 1) fp++;
    else if (yVector[i] === 1 && predictedClass === 0) fn++;
    else tn++;
  }

  // Null Log-Likelihood
  const nullP = Math.max(1e-12, Math.min(1 - 1e-12, yMean));
  const nullLogLik = n * (yMean * Math.log(nullP) + (1 - yMean) * Math.log(1 - nullP));
  const pseudoR2 = Math.max(0, Math.min(1, 1 - logLik / nullLogLik));

  const accuracy = (tp + tn) / n;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Standard errors from inverted Hessian
  const coefficients: RegressionModelCoefficients[] = [];
  for (let j = 0; j < p; j++) {
    const varName = j === 0 ? 'Intercept (β₀)' : predictorNames[j - 1];
    const est = beta[j];
    const se = invHessian ? Math.sqrt(Math.max(1e-6, invHessian[j][j])) : 1;
    const zVal = est / se;
    let pVal = 1;
    try {
      pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(zVal), 0, 1))));
    } catch {
      pVal = Math.abs(zVal) > 1.96 ? 0.05 : 0.5;
    }
    const or = Math.exp(est);
    const ciLow = Math.exp(est - 1.96 * se);
    const ciHigh = Math.exp(est + 1.96 * se);

    coefficients.push({
      variable: varName,
      estimate: Number(est.toFixed(4)),
      stdError: Number(se.toFixed(4)),
      zStat: Number(zVal.toFixed(3)),
      pValue: Number(pVal.toFixed(4)),
      oddsRatio: Number(Math.min(9999, Math.max(0.0001, or)).toFixed(3)),
      ciLower: Number(Math.min(9999, Math.max(0.0001, ciLow)).toFixed(3)),
      ciUpper: Number(Math.min(9999, Math.max(0.0001, ciHigh)).toFixed(3)),
    });
  }

  // Likelihood Ratio Test statistic G = 2 * (LL - LL_null)
  const lrStat = Math.max(0, 2 * (logLik - nullLogLik));
  let lrPVal = 1;
  try {
    lrPVal = Math.max(0, Math.min(1, 1 - jStat.chisquare.cdf(lrStat, k)));
  } catch {
    lrPVal = lrStat > 5.99 ? 0.01 : 0.5;
  }

  const isSignificant = lrPVal < alpha;
  const sigDrivers = coefficients.filter((c, idx) => idx > 0 && c.pValue < alpha);

  let takeaway = isSignificant
    ? `Statistically significant logistic regression model (χ²(${k}) = ${lrStat.toFixed(2)}, p = ${lrPVal.toFixed(4)} < ${alpha}, McFadden's R² = ${pseudoR2.toFixed(3)}). Classification accuracy is ${(accuracy * 100).toFixed(1)}% (Precision: ${(precision * 100).toFixed(1)}%, Recall: ${(recall * 100).toFixed(1)}%).`
    : `The logistic model is not statistically significant (χ² = ${lrStat.toFixed(2)}, p = ${lrPVal.toFixed(4)} ≥ ${alpha}).`;

  if (sigDrivers.length > 0) {
    takeaway += ` Significant predictor odds ratios: ${sigDrivers.map((d) => `"${d.variable}" (OR = ${d.oddsRatio})`).join(', ')}.`;
  }

  return {
    testType: 'logistic_regression',
    testName: 'Binary Logistic Regression (Logit Classification)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'χ² (LR)',
    testStatistic: Number(lrStat.toFixed(3)),
    pVal: Number(lrPVal.toFixed(5)),
    degreesOfFreedom: k,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Predictive Logit Model (Accuracy = ${(accuracy * 100).toFixed(1)}%, p = ${lrPVal.toFixed(4)})`
        : `Non-Significant Logit Model (p = ${lrPVal.toFixed(4)} ≥ ${alpha})`,
      h0: 'H₀: Predictors have zero effect on the log-odds of the binary outcome',
      ha: 'Hₐ: Predictors significantly alter the log-odds and probability of the outcome',
      takeaway,
      effectSizeLabel: `McFadden's Pseudo-R² = ${pseudoR2.toFixed(3)}`,
    },
    regressionCoefficients: coefficients,
    confusionMatrix: {
      tp,
      fp,
      fn,
      tn,
      accuracy: Number(accuracy.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1.toFixed(3)),
    },
    metrics: [
      { name: "McFadden's Pseudo-R²", value: Number(pseudoR2.toFixed(4)), description: 'Log-likelihood ratio improvement over null baseline' },
      { name: 'Model Likelihood Ratio χ²', value: Number(lrStat.toFixed(3)), description: 'Omnibus model test statistic' },
      { name: 'Model p-Value', value: lrPVal < 0.0001 ? '< 0.0001' : Number(lrPVal.toFixed(4)), description: 'Significance under null hypothesis' },
      { name: 'Overall Accuracy', value: `${(accuracy * 100).toFixed(1)}%`, description: 'Proportion of correctly classified observations' },
      { name: 'Precision / Recall', value: `${(precision * 100).toFixed(1)}% / ${(recall * 100).toFixed(1)}%`, description: 'Positive predictive value / Sensitivity' },
      { name: 'Log-Likelihood', value: Number(logLik.toFixed(2)), description: 'Log-likelihood at convergence' },
    ],
  };
}

// 11. Two-Sample Z-Test of Proportions (The Digital A/B Testing Standard)
export function runTwoSampleProportionTest(
  successes1: number,
  total1: number,
  successes2: number,
  total2: number,
  g1Name: string,
  g2Name: string,
  metricName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  if (total1 < 5 || total2 < 5) {
    throw new Error('Both cohorts must contain at least 5 trials for a valid proportion test.');
  }

  const p1 = successes1 / total1;
  const p2 = successes2 / total2;
  const diff = p1 - p2;

  // Pooled proportion under H0
  const pooledP = (successes1 + successes2) / (total1 + total2);
  const sePool = Math.sqrt(pooledP * (1 - pooledP) * (1 / total1 + 1 / total2));
  const zStat = sePool > 0 ? diff / sePool : 0;

  // Two-tailed p-value
  let pVal = 1;
  try {
    pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(zStat), 0, 1))));
  } catch {
    pVal = Math.abs(zStat) > 1.96 ? 0.05 : 0.5;
  }

  // Unpooled Standard Error for Confidence Interval
  const seDiff = Math.sqrt((p1 * (1 - p1)) / total1 + (p2 * (1 - p2)) / total2);
  const zCrit = 1.96;
  const ciLower = diff - zCrit * seDiff;
  const ciUpper = diff + zCrit * seDiff;

  const liftPercent = p2 > 0 ? (diff / p2) * 100 : 0;
  const isSignificant = pVal < alpha;

  const takeaway = isSignificant
    ? `We reject the null hypothesis (Z = ${zStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant difference in "${metricName}" conversion rate between "${g1Name}" (${(p1 * 100).toFixed(2)}%) and "${g2Name}" (${(p2 * 100).toFixed(2)}%). Relative lift: ${liftPercent > 0 ? '+' : ''}${liftPercent.toFixed(1)}% (95% CI of difference: [${(ciLower * 100).toFixed(2)}%, ${(ciUpper * 100).toFixed(2)}%]).`
    : `Fail to reject the null hypothesis (Z = ${zStat.toFixed(2)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The conversion difference between "${g1Name}" (${(p1 * 100).toFixed(2)}%) and "${g2Name}" (${(p2 * 100).toFixed(2)}%) is not statistically distinguishable from random noise.`;

  return {
    testType: 'proportion_ztest',
    testName: 'Two-Sample Z-Test of Proportions (A/B Testing)',
    tableName,
    timestamp: Date.now(),
    sampleSize: total1 + total2,
    alpha,
    statisticName: 'Z',
    testStatistic: Number(zStat.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Conversion Difference (Lift = ${liftPercent > 0 ? '+' : ''}${liftPercent.toFixed(1)}%, p = ${pVal.toFixed(4)})`
        : `No Significant Difference in Rates (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: True proportions are equal (p₁ = p₂)`,
      ha: `Hₐ: True proportions differ (p₁ ≠ p₂)`,
      takeaway,
      effectSizeLabel: `Lift = ${liftPercent > 0 ? '+' : ''}${liftPercent.toFixed(1)}% (h = ${(2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(p2))).toFixed(2)})`,
      confidenceInterval: [Number(ciLower.toFixed(4)), Number(ciUpper.toFixed(4))],
      ciLevel: 95,
    },
    proportionData: {
      group1Name: g1Name,
      group2Name: g2Name,
      count1: successes1,
      total1,
      rate1: Number(p1.toFixed(4)),
      count2: successes2,
      total2,
      rate2: Number(p2.toFixed(4)),
      pooledRate: Number(pooledP.toFixed(4)),
      difference: Number(diff.toFixed(4)),
      liftPercent: Number(liftPercent.toFixed(2)),
      ciLower: Number(ciLower.toFixed(4)),
      ciUpper: Number(ciUpper.toFixed(4)),
    },
    metrics: [
      { name: 'Z-Statistic', value: Number(zStat.toFixed(3)), description: 'Standard normal test score for difference in proportions' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Two-tailed probability under null hypothesis' },
      { name: `Cohort "${g1Name}" Rate`, value: `${(p1 * 100).toFixed(2)}% (${successes1}/${total1})`, description: 'Success rate in cohort 1' },
      { name: `Cohort "${g2Name}" Rate`, value: `${(p2 * 100).toFixed(2)}% (${successes2}/${total2})`, description: 'Success rate in cohort 2' },
      { name: 'Relative Lift (%)', value: `${liftPercent > 0 ? '+' : ''}${liftPercent.toFixed(2)}%`, description: 'Percentage increase or decrease from base cohort' },
      { name: '95% CI of Difference', value: `[${(ciLower * 100).toFixed(2)}%, ${(ciUpper * 100).toFixed(2)}%]`, description: 'Confidence interval for absolute risk difference' },
    ],
  };
}

// 12. Kruskal-Wallis H-Test (Non-Parametric One-Way ANOVA)
export function runKruskalWallisTest(
  groupsMap: Map<string, number[]>,
  metricName: string,
  groupCol: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const k = groupsMap.size;
  if (k < 2) {
    throw new Error('Kruskal-Wallis test requires at least 2 categorical groups.');
  }

  const groupKeys = Array.from(groupsMap.keys());
  const allItems: { val: number; group: string }[] = [];
  for (const [grp, vals] of groupsMap.entries()) {
    for (const v of vals) allItems.push({ val: v, group: grp });
  }

  const n = allItems.length;
  if (n < 5) throw new Error('Kruskal-Wallis requires at least 5 total observations.');

  const { ranks, ties } = computeRanksWithTies(allItems.map((x) => x.val));

  // Compute rank sum for each group
  const groupSummaries: GroupSummary[] = [];
  let sumR2OverN = 0;

  for (const grp of groupKeys) {
    const vals = groupsMap.get(grp)!;
    const groupRanks = allItems
      .map((item, idx) => (item.group === grp ? ranks[idx] : null))
      .filter((r): r is number => r !== null);

    const rSum = groupRanks.reduce((a, b) => a + b, 0);
    sumR2OverN += (rSum * rSum) / vals.length;

    const m = mean(vals);
    const s = stdDev(vals, m);
    const med = ss.median(vals);

    groupSummaries.push({
      group: grp,
      count: vals.length,
      mean: Number(m.toFixed(2)),
      stdDev: Number(s.toFixed(2)),
      stdError: Number((s / Math.sqrt(vals.length)).toFixed(2)),
      ciLower: Number((m - 1.96 * (s / Math.sqrt(vals.length))).toFixed(2)),
      ciUpper: Number((m + 1.96 * (s / Math.sqrt(vals.length))).toFixed(2)),
      median: Number(med.toFixed(2)),
      rankSum: Number(rSum.toFixed(1)),
    });
  }

  // Raw H-statistic
  let H = (12 / (n * (n + 1))) * sumR2OverN - 3 * (n + 1);

  // Tie correction factor C
  let tieSum = 0;
  for (const t of ties) {
    tieSum += (t * t * t - t);
  }
  const C = 1 - tieSum / (n * n * n - n);
  if (C > 0) H = H / C;

  const df = k - 1;
  let pVal = 1;
  try {
    pVal = Math.max(0, Math.min(1, 1 - jStat.chisquare.cdf(H, df)));
  } catch {
    pVal = H > 5.99 ? 0.05 : 0.5;
  }

  // Epsilon-squared effect size for Kruskal-Wallis
  const eps2 = Math.max(0, (H - k + 1) / (n - k));
  const isSignificant = pVal < alpha;

  const takeaway = isSignificant
    ? `We reject the null hypothesis (H = ${H.toFixed(2)}, df = ${df}, p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant difference in the rank medians of "${metricName}" across groups of "${groupCol}".`
    : `Fail to reject the null hypothesis (H = ${H.toFixed(2)}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The distribution of "${metricName}" does not statistically differ across groups of "${groupCol}".`;

  return {
    testType: 'kruskal_wallis',
    testName: 'Kruskal-Wallis H-Test (Non-Parametric ANOVA)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'H',
    testStatistic: Number(H.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Group Rank Difference (H = ${H.toFixed(2)}, p = ${pVal.toFixed(4)})`
        : `No Significant Group Difference (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Distribution of "${metricName}" is identical across all "${groupCol}" cohorts`,
      ha: `Hₐ: At least one cohort distribution is stochastically dominant or shifted`,
      takeaway,
      effectSizeLabel: `Epsilon-squared (ε²) = ${eps2.toFixed(3)} (${(eps2 * 100).toFixed(1)}% variance shared)`,
    },
    groupSummaries,
    metrics: [
      { name: 'H-Statistic (Tie-Corrected)', value: Number(H.toFixed(3)), description: 'Kruskal-Wallis test statistic' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Chi-square approximation probability under null' },
      { name: 'Degrees of Freedom', value: df, description: 'k - 1 categorical groups' },
      { name: 'Effect Size (ε²)', value: Number(eps2.toFixed(3)), description: 'Proportion of variance explained by group ranks' },
      { name: 'Groups Compared', value: k, description: 'Number of categorical levels' },
      { name: 'Total Observations', value: n, description: 'Sum of all observations' },
    ],
  };
}

// 13. Wilcoxon Signed-Rank Test (Non-Parametric Paired Test)
export function runWilcoxonSignedRankTest(
  v1: number[],
  v2: number[],
  name1: string,
  name2: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = v1.length;
  if (n < 5) throw new Error('Wilcoxon signed-rank test requires at least 5 paired rows.');

  const diffs: { diff: number; absDiff: number }[] = [];
  for (let i = 0; i < n; i++) {
    const d = v1[i] - v2[i];
    if (d !== 0) {
      diffs.push({ diff: d, absDiff: Math.abs(d) });
    }
  }

  const nr = diffs.length;
  if (nr < 5) throw new Error('Too few non-zero differences (< 5) to compute a meaningful Wilcoxon signed-rank test.');

  const { ranks, ties } = computeRanksWithTies(diffs.map((d) => d.absDiff));

  let wPlus = 0;
  let wMinus = 0;
  for (let i = 0; i < nr; i++) {
    if (diffs[i].diff > 0) wPlus += ranks[i];
    else wMinus += ranks[i];
  }

  const wStat = Math.min(wPlus, wMinus);

  // Large-sample normal approximation with continuity correction
  const meanW = (nr * (nr + 1)) / 4;
  let tieSum = 0;
  for (const t of ties) tieSum += (t * t * t - t);
  const varW = (nr * (nr + 1) * (2 * nr + 1)) / 24 - tieSum / 48;
  const seW = Math.sqrt(Math.max(1, varW));

  // Continuity corrected Z
  const zStat = (wPlus - meanW - 0.5 * Math.sign(wPlus - meanW)) / seW;
  let pVal = 1;
  try {
    pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(zStat), 0, 1))));
  } catch {
    pVal = Math.abs(zStat) > 1.96 ? 0.05 : 0.5;
  }

  const isSignificant = pVal < alpha;
  const med1 = ss.median(v1);
  const med2 = ss.median(v2);

  const takeaway = isSignificant
    ? `We reject the null hypothesis (W = ${wStat}, Z = ${zStat.toFixed(2)}, p = ${pVal.toFixed(4)} < ${alpha}). There is a statistically significant median difference between paired measures "${name1}" (median = ${med1}) and "${name2}" (median = ${med2}).`
    : `Fail to reject the null hypothesis (W = ${wStat}, p = ${pVal.toFixed(4)} ≥ ${alpha}). The paired differences between "${name1}" and "${name2}" are not statistically significant.`;

  return {
    testType: 'wilcoxon_signed_rank',
    testName: 'Wilcoxon Signed-Rank Test (Non-Parametric Paired)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'W',
    testStatistic: wStat,
    pVal: Number(pVal.toFixed(5)),
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant Paired Shift (W = ${wStat}, p = ${pVal.toFixed(4)})`
        : `No Significant Paired Shift (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: `H₀: Median difference between "${name1}" and "${name2}" equals zero`,
      ha: `Hₐ: Median difference significantly departs from zero`,
      takeaway,
      effectSizeLabel: `Matched-pairs rank biserial r = ${((wPlus - wMinus) / (wPlus + wMinus)).toFixed(2)}`,
    },
    metrics: [
      { name: 'W-Statistic', value: wStat, description: 'Smaller of positive or negative signed rank sums' },
      { name: 'Z-Score (Continuity Corrected)', value: Number(zStat.toFixed(3)), description: 'Standardized normal test statistic' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Two-tailed asymptotic probability' },
      { name: `Positive Ranks (W+)`, value: Number(wPlus.toFixed(1)), description: `Rank sum where ${name1} > ${name2}` },
      { name: `Negative Ranks (W-)`, value: Number(wMinus.toFixed(1)), description: `Rank sum where ${name1} < ${name2}` },
      { name: 'Non-Zero Pairs Analyzed', value: `${nr} of ${n}`, description: 'Pairs with non-identical values' },
    ],
  };
}

// 14. Spearman's Rank Correlation Test (Monotonic Non-Parametric)
export function runSpearmanCorrelationTest(
  xVals: number[],
  yVals: number[],
  xName: string,
  yName: string,
  tableName: string,
  alpha = 0.05
): HypothesisTestResult {
  const n = xVals.length;
  if (n < 4) throw new Error('Spearman correlation requires at least 4 paired numeric observations.');

  const rankX = computeRanksWithTies(xVals).ranks;
  const rankY = computeRanksWithTies(yVals).ranks;

  const rho = ss.sampleCorrelation(rankX, rankY);
  const df = n - 2;
  const tStat = rho * Math.sqrt(df / Math.max(1e-12, 1 - rho * rho));

  let pVal = 1;
  try {
    pVal = Math.max(0, Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df))));
  } catch {
    pVal = Math.abs(tStat) > 2 ? 0.05 : 0.5;
  }

  const isSignificant = pVal < alpha;
  const strength =
    Math.abs(rho) > 0.7 ? 'STRONG' : Math.abs(rho) > 0.4 ? 'MODERATE' : Math.abs(rho) > 0.2 ? 'WEAK' : 'NEGLIGIBLE';
  const direction = rho > 0 ? 'POSITIVE' : 'NEGATIVE';

  const takeaway = isSignificant
    ? `Statistically significant ${strength} ${direction} monotonic rank association between "${xName}" and "${yName}" (Spearman's ρ = ${rho.toFixed(3)}, p = ${pVal.toFixed(4)} < ${alpha}). Unlike Pearson correlation, this rank measure is robust to non-linear curves and extreme outliers.`
    : `No statistically significant monotonic association between "${xName}" and "${yName}" (ρ = ${rho.toFixed(3)}, p = ${pVal.toFixed(4)} ≥ ${alpha}).`;

  return {
    testType: 'spearman_correlation',
    testName: "Spearman's Rank Correlation Test (Non-Parametric Monotonic)",
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha,
    statisticName: 'ρ',
    testStatistic: Number(rho.toFixed(3)),
    pVal: Number(pVal.toFixed(5)),
    degreesOfFreedom: df,
    executiveSummary: {
      verdict: isSignificant ? 'significant' : 'not_significant',
      headline: isSignificant
        ? `Significant ${strength} ${direction} Monotonic Correlation (ρ = ${rho.toFixed(3)}, p = ${pVal.toFixed(4)})`
        : `No Significant Monotonic Correlation (p = ${pVal.toFixed(4)} ≥ ${alpha})`,
      h0: 'H₀: Population rank correlation coefficient ρ = 0 (No monotonic association)',
      ha: 'Hₐ: Population rank correlation coefficient ρ ≠ 0',
      takeaway,
      effectSizeLabel: `Rank Shared Monotonic Variance = ${(rho * rho * 100).toFixed(1)}%`,
    },
    metrics: [
      { name: "Spearman's Rho (ρ)", value: Number(rho.toFixed(3)), description: 'Degree of monotonic relationship (-1 to +1)' },
      { name: 'p-Value', value: pVal < 0.0001 ? '< 0.0001' : Number(pVal.toFixed(4)), description: 'Two-tailed significance test under null' },
      { name: 't-Statistic', value: Number(tStat.toFixed(3)), description: 'Student-t transformation for rank correlation significance' },
      { name: 'Degrees of Freedom', value: df, description: 'n - 2' },
      { name: 'Monotonic Variance (ρ²)', value: Number((rho * rho).toFixed(3)), description: 'Shared rank variance proportion' },
      { name: 'Pairs Analyzed', value: n, description: 'Total valid matched observations' },
    ],
  };
}

// Master Dispatcher with Automated Assumption Diagnostics
export function executeHypothesisTest(
  config: TestConfig,
  columns: string[],
  rows: any[][]
): HypothesisTestResult {
  const {
    testType,
    targetColumn,
    groupColumn,
    secondaryColumn,
    predictorColumns,
    benchmarkValue,
    successValue,
    alpha,
    tableName,
  } = config;

  const targetIdx = columns.indexOf(targetColumn);
  if (targetIdx === -1) {
    throw new Error(`Target column "${targetColumn}" not found in table columns.`);
  }

  // Pre-calculate target column diagnostics if continuous
  const targetRaw = rows.map((r) => r[targetIdx]);
  const targetNumeric = cleanNumericValues(targetRaw);
  const targetDiagnostics = targetNumeric.length >= 4 ? computeDiagnostics(targetNumeric) : undefined;

  let result: HypothesisTestResult;

  switch (testType) {
    case 'welch_ttest':
    case 'mann_whitney': {
      if (!groupColumn) throw new Error('A grouping column is required to split data into two cohorts.');
      const groupIdx = columns.indexOf(groupColumn);
      if (groupIdx === -1) throw new Error(`Grouping column "${groupColumn}" not found.`);

      const groupsMap = new Map<string, number[]>();
      for (const row of rows) {
        const rawGroup = String(row[groupIdx] ?? 'Unknown');
        const rawVal = row[targetIdx];
        const num = cleanNumericValues([rawVal]);
        if (num.length > 0) {
          if (!groupsMap.has(rawGroup)) groupsMap.set(rawGroup, []);
          groupsMap.get(rawGroup)!.push(num[0]);
        }
      }

      const keys = Array.from(groupsMap.keys());
      if (keys.length < 2) {
        throw new Error(`Grouping column "${groupColumn}" must contain at least 2 distinct groups (found: ${keys.join(', ')}).`);
      }

      const g1Name = keys[0];
      const g2Name = keys[1];
      const g1Vals = groupsMap.get(g1Name)!;
      const g2Vals = groupsMap.get(g2Name)!;

      if (testType === 'mann_whitney') {
        result = runMannWhitneyUTest(g1Vals, g2Vals, g1Name, g2Name, targetColumn, tableName, alpha);
      } else {
        result = runWelchTTest(g1Vals, g2Vals, g1Name, g2Name, targetColumn, tableName, alpha);
      }
      break;
    }

    case 'one_sample_ttest': {
      const benchmark = benchmarkValue !== undefined ? benchmarkValue : 0;
      result = runOneSampleTTest(targetNumeric, benchmark, targetColumn, tableName, alpha);
      break;
    }

    case 'paired_ttest':
    case 'wilcoxon_signed_rank': {
      if (!secondaryColumn) throw new Error('A second paired numeric column is required.');
      const secIdx = columns.indexOf(secondaryColumn);
      if (secIdx === -1) throw new Error(`Secondary column "${secondaryColumn}" not found.`);

      const v1: number[] = [];
      const v2: number[] = [];
      for (const row of rows) {
        const num1 = cleanNumericValues([row[targetIdx]]);
        const num2 = cleanNumericValues([row[secIdx]]);
        if (num1.length > 0 && num2.length > 0) {
          v1.push(num1[0]);
          v2.push(num2[0]);
        }
      }

      if (testType === 'wilcoxon_signed_rank') {
        result = runWilcoxonSignedRankTest(v1, v2, targetColumn, secondaryColumn, tableName, alpha);
      } else {
        result = runPairedTTest(v1, v2, targetColumn, secondaryColumn, tableName, alpha);
      }
      break;
    }

    case 'one_way_anova':
    case 'kruskal_wallis': {
      if (!groupColumn) throw new Error('A grouping column is required to categorize observations.');
      const groupIdx = columns.indexOf(groupColumn);
      if (groupIdx === -1) throw new Error(`Grouping column "${groupColumn}" not found.`);

      const groupsMap = new Map<string, number[]>();
      for (const row of rows) {
        const rawGroup = String(row[groupIdx] ?? 'Unknown');
        const num = cleanNumericValues([row[targetIdx]]);
        if (num.length > 0) {
          if (!groupsMap.has(rawGroup)) groupsMap.set(rawGroup, []);
          groupsMap.get(rawGroup)!.push(num[0]);
        }
      }

      if (testType === 'kruskal_wallis') {
        result = runKruskalWallisTest(groupsMap, targetColumn, groupColumn, tableName, alpha);
      } else {
        result = runOneWayAnova(groupsMap, targetColumn, groupColumn, tableName, alpha);
      }
      break;
    }

    case 'chi_square': {
      if (!groupColumn) throw new Error('A second categorical column is required for cross-tabulation.');
      const colIdx = columns.indexOf(groupColumn);
      if (colIdx === -1) throw new Error(`Column "${groupColumn}" not found.`);

      const rowVals: any[] = [];
      const colVals: any[] = [];
      for (const row of rows) {
        const rv = row[targetIdx];
        const cv = row[colIdx];
        if (rv !== null && rv !== undefined && cv !== null && cv !== undefined) {
          rowVals.push(rv);
          colVals.push(cv);
        }
      }
      result = runChiSquareTest(rowVals, colVals, targetColumn, groupColumn, tableName, alpha);
      break;
    }

    case 'proportion_ztest': {
      if (!groupColumn) throw new Error('A grouping column is required to partition into two cohorts.');
      const groupIdx = columns.indexOf(groupColumn);
      if (groupIdx === -1) throw new Error(`Grouping column "${groupColumn}" not found.`);

      const cohortCounts = new Map<string, { total: number; successes: number }>();
      for (const row of rows) {
        const grp = String(row[groupIdx] ?? 'Unknown');
        const val = row[targetIdx];
        if (val === null || val === undefined) continue;

        if (!cohortCounts.has(grp)) {
          cohortCounts.set(grp, { total: 0, successes: 0 });
        }
        const entry = cohortCounts.get(grp)!;
        entry.total++;

        // Determine if target value is considered success
        let isSuccess = false;
        if (successValue !== undefined && successValue !== '') {
          isSuccess = String(val).toLowerCase() === String(successValue).toLowerCase();
        } else {
          isSuccess = val === 1 || val === '1' || val === true || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'yes';
        }

        if (isSuccess) entry.successes++;
      }

      const keys = Array.from(cohortCounts.keys());
      if (keys.length < 2) {
        throw new Error(`Grouping column "${groupColumn}" must contain at least 2 distinct cohorts.`);
      }

      const g1 = keys[0];
      const g2 = keys[1];
      const data1 = cohortCounts.get(g1)!;
      const data2 = cohortCounts.get(g2)!;

      result = runTwoSampleProportionTest(
        data1.successes,
        data1.total,
        data2.successes,
        data2.total,
        g1,
        g2,
        targetColumn,
        tableName,
        alpha
      );
      break;
    }

    case 'correlation':
    case 'spearman_correlation': {
      if (!secondaryColumn) throw new Error('A second numeric variable is required to calculate correlation.');
      const secIdx = columns.indexOf(secondaryColumn);
      if (secIdx === -1) throw new Error(`Secondary column "${secondaryColumn}" not found.`);

      const xVals: number[] = [];
      const yVals: number[] = [];
      for (const row of rows) {
        const num1 = cleanNumericValues([row[targetIdx]]);
        const num2 = cleanNumericValues([row[secIdx]]);
        if (num1.length > 0 && num2.length > 0) {
          xVals.push(num1[0]);
          yVals.push(num2[0]);
        }
      }

      if (testType === 'spearman_correlation') {
        result = runSpearmanCorrelationTest(xVals, yVals, targetColumn, secondaryColumn, tableName, alpha);
      } else {
        result = runCorrelationTest(xVals, yVals, targetColumn, secondaryColumn, tableName, alpha);
      }
      break;
    }

    case 'linear_regression': {
      if (!secondaryColumn) throw new Error('An independent predictor variable (X) is required.');
      const secIdx = columns.indexOf(secondaryColumn);
      if (secIdx === -1) throw new Error(`Predictor column "${secondaryColumn}" not found.`);

      const xVals: number[] = [];
      const yVals: number[] = [];
      for (const row of rows) {
        const numY = cleanNumericValues([row[targetIdx]]);
        const numX = cleanNumericValues([row[secIdx]]);
        if (numX.length > 0 && numY.length > 0) {
          xVals.push(numX[0]);
          yVals.push(numY[0]);
        }
      }
      result = runLinearRegression(xVals, yVals, secondaryColumn, targetColumn, tableName, alpha);
      break;
    }

    case 'multiple_regression': {
      const preds = predictorColumns && predictorColumns.length > 0 ? predictorColumns : secondaryColumn ? [secondaryColumn] : [];
      if (preds.length === 0) {
        throw new Error('At least one predictor column (X) must be selected for multiple regression.');
      }

      const predIndices = preds.map((p) => {
        const idx = columns.indexOf(p);
        if (idx === -1) throw new Error(`Predictor column "${p}" not found.`);
        return idx;
      });

      const xMatrix: number[][] = [];
      const yVector: number[] = [];

      for (const row of rows) {
        const numY = cleanNumericValues([row[targetIdx]]);
        if (numY.length === 0) continue;

        let rowValid = true;
        const rowX: number[] = [];
        for (const pIdx of predIndices) {
          const numP = cleanNumericValues([row[pIdx]]);
          if (numP.length === 0) {
            rowValid = false;
            break;
          }
          rowX.push(numP[0]);
        }

        if (rowValid) {
          xMatrix.push(rowX);
          yVector.push(numY[0]);
        }
      }

      result = runMultipleLinearRegression(xMatrix, yVector, preds, targetColumn, tableName, alpha);
      break;
    }

    case 'logistic_regression': {
      const preds = predictorColumns && predictorColumns.length > 0 ? predictorColumns : secondaryColumn ? [secondaryColumn] : [];
      if (preds.length === 0) {
        throw new Error('At least one predictor column (X) must be selected for logistic regression.');
      }

      const predIndices = preds.map((p) => {
        const idx = columns.indexOf(p);
        if (idx === -1) throw new Error(`Predictor column "${p}" not found.`);
        return idx;
      });

      const xMatrix: number[][] = [];
      const yVector: number[] = [];

      for (const row of rows) {
        const rawY = row[targetIdx];
        if (rawY === null || rawY === undefined) continue;

        let yVal: number | null = null;
        if (typeof rawY === 'number') {
          if (rawY === 0 || rawY === 1) yVal = rawY;
        } else if (typeof rawY === 'boolean') {
          yVal = rawY ? 1 : 0;
        } else if (typeof rawY === 'string') {
          const str = rawY.trim().toLowerCase();
          if (str === '1' || str === 'true' || str === 'yes' || str === 'pass' || str === 'positive') yVal = 1;
          else if (str === '0' || str === 'false' || str === 'no' || str === 'fail' || str === 'negative') yVal = 0;
        }

        if (yVal === null) continue;

        let rowValid = true;
        const rowX: number[] = [];
        for (const pIdx of predIndices) {
          const numP = cleanNumericValues([row[pIdx]]);
          if (numP.length === 0) {
            rowValid = false;
            break;
          }
          rowX.push(numP[0]);
        }

        if (rowValid) {
          xMatrix.push(rowX);
          yVector.push(yVal);
        }
      }

      result = runLogisticRegression(xMatrix, yVector, preds, targetColumn, tableName, alpha);
      break;
    }

    case 'kmeans_clustering': {
      const feats = predictorColumns && predictorColumns.length > 0 ? predictorColumns : secondaryColumn ? [targetColumn, secondaryColumn] : [targetColumn];
      if (feats.length < 2) {
        throw new Error('Cluster analysis requires at least 2 numeric feature dimensions.');
      }

      const featIndices = feats.map((f) => {
        const idx = columns.indexOf(f);
        if (idx === -1) throw new Error(`Feature column "${f}" not found.`);
        return idx;
      });

      const dataMatrix: number[][] = [];
      for (const row of rows) {
        let rowValid = true;
        const rowVals: number[] = [];
        for (const fIdx of featIndices) {
          const num = cleanNumericValues([row[fIdx]]);
          if (num.length === 0) {
            rowValid = false;
            break;
          }
          rowVals.push(num[0]);
        }
        if (rowValid) {
          dataMatrix.push(rowVals);
        }
      }

      const k = config.numClusters && config.numClusters >= 2 ? config.numClusters : 3;
      result = runKMeansClustering(dataMatrix, feats, k, tableName);
      break;
    }

    default:
      throw new Error(`Unsupported test type "${testType}".`);
  }

  // Attach automated assumption diagnostics if target is continuous
  if (targetDiagnostics && !result.diagnostics) {
    result.diagnostics = targetDiagnostics;
  }

  return result;
}

// 15. K-Means Cluster Analysis (Market Segmentation & Cohort Profiling)
export function runKMeansClustering(
  dataMatrix: number[][],
  featureNames: string[],
  k: number,
  tableName: string
): HypothesisTestResult {
  const n = dataMatrix.length;
  const m = featureNames.length;

  if (n < k) {
    throw new Error(`Cluster analysis requires at least k = ${k} observations.`);
  }

  // Calculate means and standard deviations for Z-score feature standardization
  const means: number[] = new Array(m).fill(0);
  const stdDevs: number[] = new Array(m).fill(0);

  for (let j = 0; j < m; j++) {
    const colVals = dataMatrix.map((r) => r[j]);
    means[j] = mean(colVals);
    stdDevs[j] = stdDev(colVals, means[j]) || 1;
  }

  // Standardized matrix
  const standardized = dataMatrix.map((row) =>
    row.map((val, j) => (val - means[j]) / stdDevs[j])
  );

  // K-Means++ Initialization
  const centroids: number[][] = [];
  centroids.push([...standardized[Math.floor(Math.random() * n)]]);

  while (centroids.length < k) {
    const distSq: number[] = [];
    let sumDistSq = 0;

    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (const c of centroids) {
        let d = 0;
        for (let j = 0; j < m; j++) {
          const diff = standardized[i][j] - c[j];
          d += diff * diff;
        }
        if (d < minDist) minDist = d;
      }
      distSq.push(minDist);
      sumDistSq += minDist;
    }

    let r = Math.random() * sumDistSq;
    let chosenIdx = 0;
    for (let i = 0; i < n; i++) {
      r -= distSq[i];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    centroids.push([...standardized[chosenIdx]]);
  }

  // Lloyd's Iterations
  const maxIters = 35;
  const assignments: number[] = new Array(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIters; iter++) {
    iterations = iter + 1;
    let changed = false;

    // Assignment step
    for (let i = 0; i < n; i++) {
      let bestDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let j = 0; j < m; j++) {
          const diff = standardized[i][j] - centroids[c][j];
          dist += diff * diff;
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    // Update step
    const clusterSizes = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => new Array(m).fill(0));

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      clusterSizes[c]++;
      for (let j = 0; j < m; j++) {
        newCentroids[c][j] += standardized[i][j];
      }
    }

    let maxShift = 0;
    for (let c = 0; c < k; c++) {
      if (clusterSizes[c] > 0) {
        for (let j = 0; j < m; j++) {
          newCentroids[c][j] /= clusterSizes[c];
          const shift = Math.abs(newCentroids[c][j] - centroids[c][j]);
          if (shift > maxShift) maxShift = shift;
        }
        centroids[c] = newCentroids[c];
      }
    }

    if (!changed || maxShift < 1e-4) break;
  }

  // Calculate WCSS and Cluster Profiles
  const clusterWcss = new Array(k).fill(0);
  const clusterSizes = new Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    clusterSizes[c]++;
    for (let j = 0; j < m; j++) {
      const diff = standardized[i][j] - centroids[c][j];
      clusterWcss[c] += diff * diff;
    }
  }

  const totalWcss = clusterWcss.reduce((a, b) => a + b, 0);

  // Total Sum of Squares (TSS) in standardized space
  let tss = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      tss += standardized[i][j] * standardized[i][j];
    }
  }

  const bcss = Math.max(0, tss - totalWcss);
  const varianceExplained = tss > 0 ? bcss / tss : 0;

  // Unstandardize centroids back to original feature scale
  const clusterProfiles: ClusterProfile[] = [];
  for (let c = 0; c < k; c++) {
    const originalCentroid: Record<string, number> = {};
    for (let j = 0; j < m; j++) {
      const unscaled = centroids[c][j] * stdDevs[j] + means[j];
      originalCentroid[featureNames[j]] = Number(unscaled.toFixed(2));
    }

    const pct = Number(((clusterSizes[c] / n) * 100).toFixed(1));
    clusterProfiles.push({
      clusterId: c + 1,
      name: `Segment ${c + 1}`,
      size: clusterSizes[c],
      percentage: pct,
      centroid: originalCentroid,
      wcss: Number(clusterWcss[c].toFixed(2)),
    });
  }

  // Sort profiles by size descending
  clusterProfiles.sort((a, b) => b.size - a.size);

  const takeaway = `Segmented ${n} records across ${m} dimensions into ${k} clusters (Explained Variance: ${(varianceExplained * 100).toFixed(1)}%, converged in ${iterations} iterations). Segment 1 represents the largest cohort (${clusterProfiles[0].percentage}% of records).`;

  return {
    testType: 'kmeans_clustering',
    testName: 'K-Means Cluster Analysis (Cohort Segmentation)',
    tableName,
    timestamp: Date.now(),
    sampleSize: n,
    alpha: 0.05,
    statisticName: 'Inertia (WCSS)',
    testStatistic: Number(totalWcss.toFixed(2)),
    pVal: 0,
    executiveSummary: {
      verdict: 'significant',
      headline: `${k}-Cohort Cluster Analysis (Variance Explained = ${(varianceExplained * 100).toFixed(1)}%)`,
      h0: 'H₀: Records form a uniform unimodal distribution without latent clusters',
      ha: `Hₐ: Data naturally partitions into ${k} distinct multi-attribute clusters`,
      takeaway,
      effectSizeLabel: `Variance Explained Ratio = ${(varianceExplained * 100).toFixed(1)}%`,
    },
    clustering: {
      k,
      features: featureNames,
      clusters: clusterProfiles,
      totalWcss: Number(totalWcss.toFixed(2)),
      bcss: Number(bcss.toFixed(2)),
      varianceExplained: Number(varianceExplained.toFixed(4)),
      iterations,
    },
    metrics: [
      { name: 'Clusters (k)', value: k, description: 'Number of segmented customer/asset cohorts' },
      { name: 'Variance Explained (BCSS/TSS)', value: `${(varianceExplained * 100).toFixed(1)}%`, description: 'Proportion of total multi-attribute dispersion between clusters' },
      { name: 'Total Inertia (WCSS)', value: Number(totalWcss.toFixed(1)), description: 'Within-Cluster Sum of Squares compactness' },
      { name: 'Between-Cluster Inertia (BCSS)', value: Number(bcss.toFixed(1)), description: 'Separation distance between cluster centroids' },
      { name: 'Features Clustered', value: m, description: 'Number of dimensions analyzed' },
      { name: 'Convergence Iterations', value: iterations, description: 'Number of Lloyd optimization steps' },
    ],
  };
}
