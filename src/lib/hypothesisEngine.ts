import pkg from 'jstat';
import * as ss from 'simple-statistics';
import {
  HypothesisTestResult,
  TestConfig,
  GroupSummary,
  ContingencyData,
  RegressionModelCoefficients,
} from '../types/hypothesis';

const jStat = (pkg as any).jStat || pkg;

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
  interface RankedItem {
    val: number;
    group: number;
    rank: number;
  }

  const combined: RankedItem[] = [
    ...g1Values.map((v) => ({ val: v, group: 1, rank: 0 })),
    ...g2Values.map((v) => ({ val: v, group: 2, rank: 0 })),
  ];

  combined.sort((a, b) => a.val - b.val);

  // Assign average ranks for ties
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].val === combined[i].val) {
      j++;
    }
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      combined[k].rank = avgRank;
    }
    i = j + 1;
  }

  let r1 = 0;
  let r2 = 0;
  for (const item of combined) {
    if (item.group === 1) r1 += item.rank;
    else r2 += item.rank;
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = r2 - (n2 * (n2 + 1)) / 2;
  const u = Math.min(u1, u2);

  // Large-sample normal approximation for U
  const meanU = (n1 * n2) / 2;
  const varU = (n1 * n2 * (n1 + n2 + 1)) / 12;
  const stdU = Math.sqrt(varU);
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

// Master Dispatcher
export function executeHypothesisTest(
  config: TestConfig,
  columns: string[],
  rows: any[][]
): HypothesisTestResult {
  const { testType, targetColumn, groupColumn, secondaryColumn, benchmarkValue, alpha, tableName } = config;

  const targetIdx = columns.indexOf(targetColumn);
  if (targetIdx === -1) {
    throw new Error(`Target column "${targetColumn}" not found in table columns.`);
  }

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
        return runMannWhitneyUTest(g1Vals, g2Vals, g1Name, g2Name, targetColumn, tableName, alpha);
      }
      return runWelchTTest(g1Vals, g2Vals, g1Name, g2Name, targetColumn, tableName, alpha);
    }

    case 'one_sample_ttest': {
      const benchmark = benchmarkValue !== undefined ? benchmarkValue : 0;
      const vals = cleanNumericValues(rows.map((r) => r[targetIdx]));
      return runOneSampleTTest(vals, benchmark, targetColumn, tableName, alpha);
    }

    case 'paired_ttest': {
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
      return runPairedTTest(v1, v2, targetColumn, secondaryColumn, tableName, alpha);
    }

    case 'one_way_anova': {
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

      return runOneWayAnova(groupsMap, targetColumn, groupColumn, tableName, alpha);
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
      return runChiSquareTest(rowVals, colVals, targetColumn, groupColumn, tableName, alpha);
    }

    case 'correlation': {
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
      return runCorrelationTest(xVals, yVals, targetColumn, secondaryColumn, tableName, alpha);
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
      return runLinearRegression(xVals, yVals, secondaryColumn, targetColumn, tableName, alpha);
    }

    default:
      throw new Error(`Unsupported test type "${testType}".`);
  }
}
