import { HypothesisTestResult } from '../types/hypothesis';
import { DescriptiveStats } from '../types';

/**
 * Generates an executive-ready Markdown report from hypothesis testing results.
 */
export function generateFullHypothesisMarkdown(
  result: HypothesisTestResult,
  targetColumn?: string,
  targetNumericData?: number[]
): string {
  const dateStr = new Date().toLocaleString();
  const lines: string[] = [];

  lines.push(`# 🍼 BabySQL Enterprise Hypothesis Testing Report`);
  lines.push(`## ${result.testName}`);
  lines.push(``);
  lines.push(`- **Date Generated:** ${dateStr}`);
  lines.push(`- **Data Source Table:** \`${result.tableName}\``);
  lines.push(`- **Sample Size ($N$):** ${result.sampleSize}`);
  lines.push(`- **Significance Level ($\\alpha$):** ${result.alpha}`);
  lines.push(`- **Test Statistic (${result.statisticName}):** ${result.testStatistic}`);
  lines.push(`- **$p$-value:** ${result.pVal}`);
  if (result.degreesOfFreedom !== undefined) {
    lines.push(`- **Degrees of Freedom ($df$):** ${result.degreesOfFreedom}`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Executive Verdict
  lines.push(`### 🎯 Executive Summary & Verdict`);
  lines.push(``);
  lines.push(`> **${result.executiveSummary.headline}**`);
  lines.push(`> `);
  lines.push(`> ${result.executiveSummary.takeaway}`);
  if (result.executiveSummary.effectSizeLabel) {
    lines.push(`> `);
    lines.push(`> **Effect Size:** ${result.executiveSummary.effectSizeLabel}`);
  }
  lines.push(``);
  lines.push(`- **Null Hypothesis ($H_0$):** ${result.executiveSummary.h0}`);
  lines.push(`- **Alternative Hypothesis ($H_a$):** ${result.executiveSummary.ha}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Diagnostics
  if (result.diagnostics) {
    lines.push(`### 🛡️ Statistical Assumption Diagnostics`);
    lines.push(``);
    lines.push(`- **Skewness:** ${result.diagnostics.skewness}`);
    lines.push(`- **Excess Kurtosis:** ${result.diagnostics.kurtosis}`);
    lines.push(`- **Jarque-Bera Normality Statistic:** ${result.diagnostics.jarqueBeraStat} ($p$ = ${result.diagnostics.jarqueBeraPVal})`);
    if (result.diagnostics.recommendation) {
      lines.push(`- **Advisory Note:** ${result.diagnostics.recommendation}`);
    } else {
      lines.push(`- **Advisory Note:** Normality and distributional assumptions satisfied.`);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // Metrics Table
  lines.push(`### 📊 Test Metrics & Parameters`);
  lines.push(``);
  lines.push(`| Metric / Parameter | Value | Description |`);
  lines.push(`| :--- | :--- | :--- |`);
  result.metrics.forEach((m) => {
    lines.push(`| **${m.name}** | \`${m.value}\` | ${m.description} |`);
  });
  lines.push(``);

  // Cronbach's Alpha Scale Reliability
  if (result.cronbach) {
    lines.push(`### 📐 Cronbach's Alpha Survey Scale Reliability`);
    lines.push(``);
    lines.push(`- **Raw Cronbach's Alpha ($\\alpha$):** \`${result.cronbach.alpha}\``);
    lines.push(`- **Standardized Alpha:** \`${result.cronbach.standardizedAlpha}\``);
    lines.push(`- **Number of Scale Items:** ${result.cronbach.itemCount}`);
    lines.push(`- **Total Score Variance:** ${result.cronbach.totalVariance}`);
    lines.push(`- **Internal Consistency Tier:** ${result.cronbach.interpretation}`);
    lines.push(``);
    lines.push(`#### Item-Total Statistics`);
    lines.push(``);
    lines.push(`| Survey Item | Item Mean | Item Std Dev | Corrected Item-Total Corr ($r$) | Alpha If Deleted ($\\alpha_{-j}$) | Recommendation |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`);
    result.cronbach.items.forEach((it) => {
      const action = it.alphaIfDeleted > result.cronbach!.alpha + 0.02 ? 'Consider Deleting' : it.itemTotalCorr < 0.2 ? 'Weak Correlation' : 'Retain Item';
      lines.push(`| **${it.item}** | ${it.mean} | ${it.stdDev} | ${it.itemTotalCorr} | ${it.alphaIfDeleted} | ${action} |`);
    });
    lines.push(``);
  }

  // 1. Group Summaries (ANOVA / Kruskal-Wallis / Two-sample t-test / Mann-Whitney)
  if (result.groupSummaries && result.groupSummaries.length > 0) {
    lines.push(`### 👥 Group Summary Breakdown`);
    lines.push(``);
    lines.push(`| Group | Count ($N$) | Mean | Std Dev | Std Error | 95% Confidence Interval |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`);
    result.groupSummaries.forEach((g) => {
      lines.push(`| **${g.group}** | ${g.count} | ${g.mean} | ${g.stdDev} | ${g.stdError} | [${g.ciLower}, ${g.ciUpper}] |`);
    });
    lines.push(``);
  }

  // Tukey's HSD Post-Hoc Pairwise Matrix (ANOVA)
  if (result.postHoc && result.postHoc.length > 0) {
    lines.push(`### 🔬 Tukey's HSD Post-Hoc Pairwise Matrix (Tukey-Kramer Test)`);
    lines.push(``);
    lines.push(`| Pairwise Comparison | Mean Diff | Std Error | Studentized Range ($q$) | Adjusted $p$-value | 95% Confidence Interval | Significant |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    result.postHoc.forEach((p) => {
      lines.push(`| **${p.groupA}** vs **${p.groupB}** | \`${p.meanDiff > 0 ? '+' : ''}${p.meanDiff}\` | ${p.stdError} | ${p.qStat} | ${p.pValue} | [${p.ciLower}, ${p.ciUpper}] | ${p.isSignificant ? '**Yes (p < alpha)**' : 'No'} |`);
    });
    lines.push(``);
  }

  // 2. Contingency Table (Chi-Square)
  if (result.contingency) {
    lines.push(`### 🎲 Contingency Table (Observed vs Expected)`);
    lines.push(``);
    const colHeaders = result.contingency.colLabels.join(' | ');
    lines.push(`| Row Category | ${colHeaders} | Total |`);
    lines.push(`| :--- | ${result.contingency.colLabels.map(() => ':---').join(' | ')} | :--- |`);
    result.contingency.rowLabels.forEach((rLabel, rIdx) => {
      const rowVals = result.contingency!.observed[rIdx]
        .map((obs, cIdx) => `${obs} *(exp: ${result.contingency!.expected[rIdx][cIdx]})*`)
        .join(' | ');
      lines.push(`| **${rLabel}** | ${rowVals} | ${result.contingency!.rowTotals[rIdx]} |`);
    });
    lines.push(``);
  }

  // 3. Regression Model Coefficients (OLS / Multiple Regression / Logistic)
  if (result.regressionCoefficients && result.regressionCoefficients.length > 0) {
    const isLogistic = result.testType === 'logistic_regression';
    lines.push(
      isLogistic
        ? `### 🎯 Binary Logistic Regression Parameter Estimates & Odds Ratios`
        : `### 📈 Multiple Linear Regression Parameter Estimates`
    );
    lines.push(``);
    if (isLogistic) {
      lines.push(
        `| Feature | Log-Odds ($\\beta$) | Std Error | Wald $Z$ | $p$-value | Odds Ratio ($e^\\beta$) | 95% CI of OR |`
      );
      lines.push(
        `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
      );
      result.regressionCoefficients.forEach((c) => {
        lines.push(
          `| **${c.variable}** | \`${c.estimate}\` | ${c.stdError} | ${c.zStat ?? c.tStat ?? 'N/A'} | ${c.pValue} | **${c.oddsRatio ?? 'N/A'}** | [${c.ciLower ?? ''}, ${c.ciUpper ?? ''}] |`
        );
      });
    } else {
      lines.push(
        `| Predictor | Coefficient ($\\beta$) | Std Error | $t$-Statistic | $p$-value | VIF | Multicollinearity Risk |`
      );
      lines.push(
        `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
      );
      result.regressionCoefficients.forEach((c) => {
        const risk = c.vif !== undefined ? (c.vif > 10 ? 'High' : c.vif > 5 ? 'Moderate' : 'Low') : 'N/A';
        lines.push(
          `| **${c.variable}** | \`${c.estimate}\` | ${c.stdError} | ${c.tStat ?? 'N/A'} | ${c.pValue} | ${c.vif ?? 'N/A'} | ${risk} |`
        );
      });
    }
    lines.push(``);

    if (result.regressionDiagnostics) {
      lines.push(`#### 🛡️ Residual Assumption Diagnostics (Gauss-Markov Check)`);
      lines.push(``);
      lines.push(`- **Durbin-Watson ($d$):** \`${result.regressionDiagnostics.durbinWatson}\` (${result.regressionDiagnostics.durbinWatsonInterpretation})`);
      lines.push(`- **Breusch-Pagan Test ($LM$):** \`${result.regressionDiagnostics.breuschPaganStat}\` ($p$ = ${result.regressionDiagnostics.breuschPaganPVal})`);
      lines.push(`- **Homoscedasticity Verdict:** ${result.regressionDiagnostics.isHomoscedastic ? 'Constant variance holds (Residuals homoscedastic)' : 'Heteroscedasticity detected (Consider robust standard errors)'}`);
      lines.push(``);
    }
  }

  // 4. Binary Logistic Classification Confusion Matrix
  if (result.confusionMatrix) {
    lines.push(`#### 🎯 Classification Performance & Confusion Matrix`);
    lines.push(``);
    lines.push(`| Metric | Value | Interpretation |`);
    lines.push(`| :--- | :--- | :--- |`);
    lines.push(`| **Accuracy** | ${result.confusionMatrix.accuracy}% | Overall correct classification rate |`);
    lines.push(`| **Precision** | ${result.confusionMatrix.precision}% | True positives / Predicted positives |`);
    lines.push(`| **Recall (Sensitivity)** | ${result.confusionMatrix.recall}% | True positives / Actual positives |`);
    lines.push(`| **F1-Score** | ${result.confusionMatrix.f1Score}% | Harmonic mean of precision & recall |`);
    lines.push(`| **True Positives (TP)** | ${result.confusionMatrix.tp} | Event correctly predicted |`);
    lines.push(`| **True Negatives (TN)** | ${result.confusionMatrix.tn} | Non-event correctly predicted |`);
    lines.push(`| **False Positives (FP)** | ${result.confusionMatrix.fp} | Type I Error |`);
    lines.push(`| **False Negatives (FN)** | ${result.confusionMatrix.fn} | Type II Error |`);
    lines.push(``);
  }

  // 5. K-Means Clustering Profiles
  if (result.clustering) {
    lines.push(`### 🌐 K-Means Cluster Analysis & Segment Profiles`);
    lines.push(``);
    lines.push(`- **Number of Clusters ($k$):** ${result.clustering.k}`);
    lines.push(`- **Variance Explained Ratio:** ${result.clustering.varianceExplained}%`);
    lines.push(`- **Total WCSS (Inertia):** ${result.clustering.totalWcss}`);
    lines.push(`- **Between-Cluster SS (BCSS):** ${result.clustering.bcss}`);
    lines.push(`- **Convergence Iterations:** ${result.clustering.iterations}`);
    lines.push(``);
    lines.push(`#### Segment Centroid Matrix`);
    lines.push(``);
    const featHeaders = result.clustering.features.map((f) => `${f} (Mean)`).join(' | ');
    lines.push(`| Segment | Size | % Share | ${featHeaders} | WCSS |`);
    lines.push(`| :--- | :--- | :--- | ${result.clustering.features.map(() => ':---').join(' | ')} | :--- |`);
    result.clustering.clusters.forEach((cl) => {
      const featVals = result.clustering!.features.map((f) => cl.centroid[f]).join(' | ');
      lines.push(`| **${cl.name}** | ${cl.size} | ${cl.percentage}% | ${featVals} | ${cl.wcss} |`);
    });
    lines.push(``);
  }

  // 6. Proportions Test (A/B testing)
  if (result.proportionData) {
    lines.push(`### ⚖️ A/B Proportion Comparison & Power Planning`);
    lines.push(``);
    lines.push(`- **Control (${result.proportionData.group1Name}):** ${result.proportionData.count1}/${result.proportionData.total1} (${(result.proportionData.rate1 * 100).toFixed(2)}%)`);
    lines.push(`- **Variant (${result.proportionData.group2Name}):** ${result.proportionData.count2}/${result.proportionData.total2} (${(result.proportionData.rate2 * 100).toFixed(2)}%)`);
    lines.push(`- **Observed Lift:** ${result.proportionData.liftPercent > 0 ? '+' : ''}${result.proportionData.liftPercent}%`);
    lines.push(`- **Risk Difference 95% CI:** [${(result.proportionData.ciLower * 100).toFixed(2)}%, ${(result.proportionData.ciUpper * 100).toFixed(2)}%]`);
    lines.push(``);
  }

  // 7. Distribution Summary if available
  if (targetNumericData && targetNumericData.length >= 2) {
    const sorted = [...targetNumericData].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const med = sorted[Math.floor(sorted.length / 2)];
    lines.push(`### 📐 Continuous Metric Distribution Summary (\`${targetColumn || 'Metric'}\`)`);
    lines.push(``);
    lines.push(`- **Minimum:** ${min}`);
    lines.push(`- **Median ($Q_2$):** ${med}`);
    lines.push(`- **Maximum:** ${max}`);
    lines.push(`- **Total Observations Analyzed:** ${sorted.length}`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Report generated locally with BabySQL Enterprise Hypothesis Testing Platform. Zero cloud telemetry • 100% Offline.*`);

  return lines.join('\n');
}

/**
 * Generates an executive-ready Markdown report from descriptive statistics profiling.
 */
export function generateDescriptiveStatsMarkdown(
  stats: DescriptiveStats,
  tableName?: string
): string {
  const dateStr = new Date().toLocaleString();
  const lines: string[] = [];

  lines.push(`# 🍼 BabySQL Enterprise Hypothesis Testing Platform`);
  lines.push(`## Descriptive Statistical Profile: \`${stats.columnName}\``);
  lines.push(``);
  lines.push(`- **Date Generated:** ${dateStr}`);
  if (tableName) {
    lines.push(`- **Data Source Table:** \`${tableName}\``);
  }
  lines.push(`- **Target Column:** \`${stats.columnName}\``);
  lines.push(`- **Data Type:** ${stats.isNumeric ? 'Continuous / Numeric' : 'Categorical / Discrete'}`);
  lines.push(`- **Total Rows ($N$):** ${stats.totalCount.toLocaleString()}`);
  lines.push(`- **Valid Observations ($n$):** ${stats.validCount.toLocaleString()}`);
  lines.push(`- **Missing / Nulls:** ${stats.nullCount.toLocaleString()} (${stats.nullPercentage}%)`);
  lines.push(`- **Distinct Entities:** ${stats.uniqueCount.toLocaleString()}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  if (stats.isNumeric) {
    lines.push(`### 📐 Central Tendency & Dispersion Metrics`);
    lines.push(``);
    lines.push(`| Metric | Value | Mathematical Definition |`);
    lines.push(`| :--- | :--- | :--- |`);
    lines.push(`| **Arithmetic Mean ($\\mu$)** | \`${stats.mean?.toLocaleString()}\` | First raw sample moment $\\bar{x} = \\frac{1}{n}\\sum x_i$ |`);
    lines.push(`| **Median ($Q_2$)** | \`${stats.median?.toLocaleString()}\` | 50th percentile (robust central point) |`);
    lines.push(`| **Standard Deviation ($s$)** | \`${stats.stdDev?.toLocaleString()}\` | Sample root mean square error (Bessel's corrected $n-1$) |`);
    lines.push(`| **Sample Variance ($s^2$)** | \`${stats.variance?.toLocaleString()}\` | Unbiased sample dispersion $\\frac{1}{n-1}\\sum (x_i - \\bar{x})^2$ |`);
    if (stats.stdError !== undefined) {
      lines.push(`| **Standard Error ($SE_{\\bar{x}}$)** | \`${stats.stdError.toLocaleString()}\` | Standard error of sample mean $\\frac{s}{\\sqrt{n}}$ |`);
    }
    if (stats.sum !== undefined) {
      lines.push(`| **Sum ($\\Sigma$)** | \`${stats.sum.toLocaleString()}\` | Total aggregate sum |`);
    }
    lines.push(`| **Interquartile Range ($IQR$)** | \`${stats.iqr?.toLocaleString()}\` | Mid-spread $Q_3 - Q_1$ |`);
    lines.push(``);

    lines.push(`### 📊 Five-Number Quartile Summary`);
    lines.push(``);
    lines.push(`| Quartile / Order Statistic | Value | Percentile |`);
    lines.push(`| :--- | :--- | :--- |`);
    lines.push(`| **Minimum ($Min$)** | \`${stats.min?.toLocaleString()}\` | 0th percentile |`);
    lines.push(`| **Lower Quartile ($Q_1$)** | \`${stats.q1?.toLocaleString()}\` | 25th percentile |`);
    lines.push(`| **Median ($Q_2$)** | \`${stats.median?.toLocaleString()}\` | 50th percentile |`);
    lines.push(`| **Upper Quartile ($Q_3$)** | \`${stats.q3?.toLocaleString()}\` | 75th percentile |`);
    lines.push(`| **Maximum ($Max$)** | \`${stats.max?.toLocaleString()}\` | 100th percentile |`);
    if (stats.max !== undefined && stats.min !== undefined) {
      lines.push(`| **Total Range** | \`${(stats.max - stats.min).toLocaleString()}\` | $Max - Min$ |`);
    }
    lines.push(``);

    if (stats.skewness !== undefined || stats.kurtosis !== undefined) {
      lines.push(`### 🛡️ Distribution Shape & Moment Diagnostics`);
      lines.push(``);
      lines.push(`- **Skewness (Fisher $g_1$):** \`${stats.skewness}\` ${
        (stats.skewness || 0) > 1
          ? '(Substantial positive/right skew)'
          : (stats.skewness || 0) < -1
          ? '(Substantial negative/left skew)'
          : '(Symmetric / approximately normal)'
      }`);
      lines.push(`- **Excess Kurtosis ($g_2$):** \`${stats.kurtosis}\` ${
        (stats.kurtosis || 0) > 1
          ? '(Leptokurtic: heavy tails & sharper peak)'
          : (stats.kurtosis || 0) < -1
          ? '(Platykurtic: light tails & flatter distribution)'
          : '(Mesokurtic: normal-like tail weight)'
      }`);
      lines.push(``);
    }

    if (stats.histogram && stats.histogram.length > 0) {
      lines.push(`### 📈 Frequency Distribution Histogram Bins`);
      lines.push(``);
      lines.push(`| Bin Range $[Min, Max)$ | Absolute Count | Share (%) | Cumulative Share (%) |`);
      lines.push(`| :--- | :--- | :--- | :--- |`);
      stats.histogram.forEach((bin) => {
        lines.push(
          `| \`${bin.binLabel}\` | ${bin.count.toLocaleString()} | ${bin.percentage}% | ${bin.cumulativePercentage ?? 'N/A'}% |`
        );
      });
      lines.push(``);
    }
  } else if (stats.topValues && stats.topValues.length > 0) {
    lines.push(`### 🏷️ Top Categorical Value Frequencies`);
    lines.push(``);
    lines.push(`| Rank | Category Value | Frequency Count | Share (%) |`);
    lines.push(`| :--- | :--- | :--- | :--- |`);
    stats.topValues.forEach((item, idx) => {
      lines.push(`| ${idx + 1} | **${item.value || '(blank)'}** | ${item.count.toLocaleString()} | ${item.percentage}% |`);
    });
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Profile generated locally with BabySQL Enterprise Hypothesis Testing Platform. Zero cloud telemetry • 100% Offline.*`);

  return lines.join('\n');
}

/**
 * Initiates a browser file download of text content.
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
