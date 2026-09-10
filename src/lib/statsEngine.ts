import { DescriptiveStats, HistogramBin } from '../types';

export function calculateDescriptiveStats(columnName: string, rawValues: any[]): DescriptiveStats {
  const totalCount = rawValues.length;
  const nonNullValues = rawValues.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ''
  );
  const nullCount = totalCount - nonNullValues.length;
  const nullPercentage = totalCount > 0 ? Math.round((nullCount / totalCount) * 1000) / 10 : 0;

  // Unique count
  const uniqueSet = new Set(nonNullValues.map((v) => String(v)));
  const uniqueCount = uniqueSet.size;

  // Check if numeric
  let numericCount = 0;
  const numbers: number[] = [];
  for (const v of nonNullValues) {
    const num = typeof v === 'number' ? v : parseFloat(String(v));
    if (!isNaN(num)) {
      numericCount++;
      numbers.push(num);
    }
  }

  const isNumeric = nonNullValues.length > 0 && numericCount / nonNullValues.length >= 0.8;

  if (isNumeric && numbers.length > 0) {
    numbers.sort((a, b) => a - b);
    const n = numbers.length;
    const min = numbers[0];
    const max = numbers[n - 1];
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const mean = Math.round((sum / n) * 1000) / 1000;

    // Median
    let median: number;
    if (n % 2 === 0) {
      median = (numbers[n / 2 - 1] + numbers[n / 2]) / 2;
    } else {
      median = numbers[Math.floor(n / 2)];
    }
    median = Math.round(median * 1000) / 1000;

    // Quartiles
    const getPercentile = (arr: number[], p: number) => {
      const idx = (arr.length - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return arr[lower] * (1 - weight) + arr[upper] * weight;
    };

    const q1 = Math.round(getPercentile(numbers, 0.25) * 1000) / 1000;
    const q3 = Math.round(getPercentile(numbers, 0.75) * 1000) / 1000;
    const iqr = Math.round((q3 - q1) * 1000) / 1000;

    // Variance, StdDev (Sample Variance) and StdError
    const varianceSum = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = n > 1 ? Math.round((varianceSum / (n - 1)) * 1000) / 1000 : 0;
    const stdDev = Math.round(Math.sqrt(variance) * 1000) / 1000;
    const stdError = n > 0 ? Math.round((stdDev / Math.sqrt(n)) * 1000) / 1000 : 0;

    // Moments: Skewness and Kurtosis
    let m2 = 0;
    let m3 = 0;
    let m4 = 0;
    for (const v of numbers) {
      const d = v - mean;
      m2 += d * d;
      m3 += d * d * d;
      m4 += d * d * d * d;
    }
    m2 /= n;
    m3 /= n;
    m4 /= n;
    const popS = Math.sqrt(m2);
    const skewness = popS > 0 ? Math.round((m3 / Math.pow(popS, 3)) * 1000) / 1000 : 0;
    const kurtosis = popS > 0 ? Math.round((m4 / Math.pow(popS, 4) - 3) * 1000) / 1000 : 0;

    // Build 8-bin histogram with mathematically exact intervals
    const histogram: HistogramBin[] = [];
    const numBins = 8;
    const range = max - min;
    const binSize = range === 0 ? 1 : range / numBins;

    const formatBinVal = (v: number) => {
      if (Math.abs(v) >= 10000) return Math.round(v).toLocaleString();
      if (Number.isInteger(v)) return v.toString();
      return (Math.round(v * 10) / 10).toString();
    };

    for (let i = 0; i < numBins; i++) {
      const binMin = min + i * binSize;
      const binMax = i === numBins - 1 ? max : min + (i + 1) * binSize;
      const binLabel =
        i === numBins - 1
          ? `[${formatBinVal(binMin)}, ${formatBinVal(binMax)}]`
          : `[${formatBinVal(binMin)}, ${formatBinVal(binMax)})`;

      histogram.push({
        binLabel,
        min: binMin,
        max: binMax,
        count: 0,
        percentage: 0,
      });
    }

    for (const num of numbers) {
      let placed = false;
      for (let i = 0; i < numBins; i++) {
        if (
          (num >= histogram[i].min && num < histogram[i].max) ||
          (i === numBins - 1 && num === histogram[i].max)
        ) {
          histogram[i].count++;
          placed = true;
          break;
        }
      }
      if (!placed && histogram.length > 0) {
        histogram[histogram.length - 1].count++;
      }
    }

    let cumCount = 0;
    for (const bin of histogram) {
      bin.percentage = Math.round((bin.count / n) * 1000) / 10;
      cumCount += bin.count;
      bin.cumulativeCount = cumCount;
      bin.cumulativePercentage = Math.round((cumCount / n) * 1000) / 10;
    }

    return {
      columnName,
      isNumeric: true,
      totalCount,
      validCount: n,
      nullCount,
      nullPercentage,
      uniqueCount,
      min,
      max,
      sum: Math.round(sum * 100) / 100,
      mean,
      median,
      variance,
      stdDev,
      stdError,
      skewness,
      kurtosis,
      q1,
      q3,
      iqr,
      histogram,
    };
  }

  // Categorical frequency
  const frequencyMap = new Map<string, number>();
  for (const v of nonNullValues) {
    const s = String(v);
    frequencyMap.set(s, (frequencyMap.get(s) || 0) + 1);
  }

  const sortedFreq = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topValues = sortedFreq.map(([value, count]) => ({
    value,
    count,
    percentage:
      nonNullValues.length > 0
        ? Math.round((count / nonNullValues.length) * 1000) / 10
        : 0,
  }));

  return {
    columnName,
    isNumeric: false,
    totalCount,
    validCount: nonNullValues.length,
    nullCount,
    nullPercentage,
    uniqueCount,
    topValues,
  };
}
