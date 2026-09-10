# 🍼 BabySQL Enterprise Hypothesis Testing Platform

<div align="center">

[![GitHub Repo](https://img.shields.io/badge/GitHub-BabySQL-blue?logo=github)](https://github.com/antarishpdeshpande-cyber/BabySQL)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Engine](https://img.shields.io/badge/Engine-SQLite%203%20WASM-cyan.svg)](https://sql.js.org/)
[![Stats Engine](https://img.shields.io/badge/Stats-Pure%20TS%20%7C%20jStat%20%7C%20simple--statistics-blueviolet.svg)]()
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-488%20kB%20(147%20kB%20gzipped)-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20%26%20Offline-orange.svg)]()
[![Design](https://img.shields.io/badge/Theme-Dark%20%7C%20Minimalist%20Light-teal.svg)]()

<br />

**An ultra-lightweight, zero-cloud, privacy-first SQLite database studio, CSV ingestion engine, and Enterprise Hypothesis Testing Platform.**

*Runs 100% locally inside your browser via WebAssembly SQLite 3. No database servers, no heavy Electron runtimes, zero cloud telemetry, instant sub-5ms statistical calculations, and standalone execution via `run.bat`.*

[Quickstart](#-quickstart-totally-standalone) • [Which Test to Use](#-data-types--business-use-cases) • [Statistical Models](#-15-enterprise-hypothesis-testing-models) • [Assumption Diagnostics](#-automated-assumption-diagnostics) • [Low-Graphic Visualizations](#-low-graphic-distribution-graphs) • [Sampling & Simulation](#-dataset-sampling--simulation) • [Benchmarks](#-load-capacity--benchmarks)

</div>

---

## 🎯 Core Principles

1. **Lightweight (< 500 kB JS)**: Zero heavy dependencies. Zero bloated charting packages. No heavy matrix libraries. All matrix inversion (Gauss-Jordan with partial pivoting), Newton-Raphson IRLS logistic regression, $k$-Means++ clustering, SVG Box & Whisker plots, and Gaussian KDE curves are written in lean, native TypeScript.
2. **Accurate**: Impeccable mathematical formulations with exact degrees of freedom, tie-corrections (Wilcoxon, Kruskal-Wallis), Wald tests, odds ratios, Variance Inflation Factors (VIF), and Jarque-Bera normality statistics.
3. **100% Standalone & Offline**: Completely self-contained. Works right after downloading or cloning via `run.bat` (Windows) or `python serve.py` / `node bin/babysql.js` without running `npm install`.

---

## 🧭 Data Types & Business Use Cases

```
                                  DATA TYPES & BUSINESS USE CASES
                                                 │
         ┌──────────────────────────────┬────────┴────────────────────────┬──────────────────────────────┐
         ▼                              ▼                                 ▼                              ▼
  CONTINUOUS / NUMERIC          CATEGORICAL / BINARY             MULTIVARIATE MODELS            ASSUMPTION DIAGNOSTICS
  ────────────────────          ────────────────────             ───────────────────            ──────────────────────
  • 2 Groups: Welch's t-Test    • A/B Conversion: 2-Prop Z-Test  • Multiple Linear Regress.     • Skewness & Kurtosis
  • 3+ Groups: One-Way ANOVA    • Group Indep.: Chi-Square (χ²)  • Binary Logistic Regression   • Jarque-Bera Normality Test
  • Non-Parametric: Mann-Whitney• Goodness of Fit χ² Test        • K-Means Cluster Analysis     • Multicollinearity (VIF)
  • Paired / Before-After: t    • Cramér's V Association         • Correlation: Pearson/Spearman• Cochran Contingency Checks
```

---

## 🚀 Quickstart (Totally Standalone — Zero Prerequisites)

BabySQL is designed to run **instantly with zero software installation or setup**:

### Option 1: Windows (One-Click Standalone — Zero Installation)
Double-click **`run.bat`** in the repository root.
* Automatically verifies the production bundle (`dist/index.html` or self-extracts `dist.zip`).
* **Zero Prerequisites**: Works out-of-the-box on any Windows 10/11 PC. If Node.js or Python is present, it uses them; otherwise, it automatically falls back to Windows's native built-in **PowerShell HTTP engine** (`serve.ps1`).
* Launches [http://localhost:3000](http://localhost:3000) directly in your default web browser.

### Option 2: Python (Zero Node.js Required)
```bash
python serve.py
```

### Option 3: Node.js (Zero npm install Required)
```bash
node bin/babysql.js
```

*(For developers modifying source code: `npm install` followed by `npm run dev` or `npm run build`.)*

---

## 🧪 16 Enterprise Hypothesis Testing Models

All models execute in client-side WebAssembly / TypeScript in **under 5 milliseconds** and generate executive plain-English summaries with actionable business takeaways:

### 1. Means & Group Comparisons
* **Two-Sample Welch's $t$-Test**: Unpaired test robust to unequal variances. Yields $t$-stat, Welch-Satterthwaite $df$, $p$-value, Cohen's $d$, and 95% Confidence Interval.
* **One-Sample $t$-Test**: Tests sample mean against an external target/SLA benchmark.
* **Paired Samples $t$-Test**: Within-subject before vs after interventions with difference scores.
* **One-Way ANOVA ($F$-Test)**: Multi-group variance decomposition ($SS_{\text{between}} / SS_{\text{within}}$), $F$-ratio, and $\eta^2$ effect size. Includes **Tukey's HSD (Honestly Significant Difference)** post-hoc pairwise matrix (Tukey-Kramer method for unequal sizes) calculating Studentized range statistics ($q$), family-wise error adjusted $p$-values, and 95% confidence intervals.

### 2. Categorical & Proportions
* **Two-Sample $Z$-Test of Proportions**: High-precision A/B testing comparing conversion rates ($p_1$ vs $p_2$). Outputs pooled variance $Z$-score, risk difference 95% CI, percentage lift, achieved statistical power ($1 - \beta$), and an embedded **A Priori Statistical Power & Sample Size Determination Planner** calculating required sample sizes ($n$) for target MDE lifts at 80% power.
* **Chi-Square Test of Independence ($\chi^2$)**: Contingency table analysis testing association between two categorical factors, with Cramér's $V$ and Cochran's rule validation.
* **Chi-Square Goodness of Fit**: Tests categorical distribution against theoretical or equal frequencies.

### 3. Predictive, Psychometrics & Multivariate Modeling
* **Multiple Linear Regression (Multivariate OLS)**: Predicts a continuous outcome from multiple numerical predictors. Calculates regression coefficients ($\beta_j$), standard errors, $t$-values, $p$-values, $R^2$, Adjusted $R^2$, ANOVA model $F$-test, and **Variance Inflation Factors (VIF)** for multicollinearity detection. Includes **Residual Assumption Diagnostics**: **Durbin-Watson ($d$)** first-order autocorrelation test and **Breusch-Pagan Lagrange Multiplier ($LM$)** heteroscedasticity test.
* **Cronbach's Alpha ($\alpha$) Survey Scale Reliability**: Evaluates internal consistency and measurement reliability of multi-item Likert rating scales, CSAT, or NPS questionnaires. Reports raw $\alpha$, standardized $\alpha$, qualitative reliability tier (Excellent, Good, Acceptable, etc.), and a comprehensive **Item-Total Statistics Table** with Corrected Item-Total correlation ($r$) and "Alpha if item deleted" ($\alpha_{-j}$) diagnostics.
* **Binary Logistic Regression**: Fits log-odds of a binary event ($Y \in \{0, 1\}$) via Iteratively Reweighted Least Squares (IRLS Newton-Raphson). Reports logit coefficients, Wald $Z$-scores, **Odds Ratios ($e^\beta$)**, 95% CI of Odds Ratios, Log-Likelihood, McFadden's Pseudo-$R^2$, and a **Confusion Matrix** with Accuracy, Precision, Recall, and F1-Score.
* **Simple Linear Regression**: Single-predictor OLS regression with line of best fit.
* **Pearson Correlation**: Bivariate linear association coefficient ($r$), $t$-test, and shared variance ($r^2$).

### 4. Non-Parametric & Distribution-Free Models
* **Mann-Whitney $U$ Test**: Rank-sum test for two independent groups when normality is violated.
* **Kruskal-Wallis $H$-Test**: Non-parametric one-way ANOVA across 3+ groups using global ranks with **exact tie corrections** and $\epsilon^2$ effect size.
* **Wilcoxon Signed-Rank Test**: Non-parametric paired test using signed differences with tie correction and continuity-adjusted $Z$-statistic.
* **Spearman's Rank Correlation ($\rho$)**: Monotonic correlation for ordinal or non-linear associations.

### 5. Unsupervised Segmentation & Clustering
* **$K$-Means Cluster Analysis**: Discovers natural customer or operational segments across multiple features. Includes:
  * Z-score standardization across features.
  * $k$-Means++ smart centroid initialization.
  * Lloyd convergence iterations.
  * Within-Cluster Sum of Squares (**WCSS / Inertia**).
  * Between-Cluster Sum of Squares (**BCSS**).
  * **Variance Explained Ratio** ($\text{BCSS} / \text{Total SS}$).
  * Segment profiling table showing cluster sizes, percentages, and original-scale feature averages.

---

## 🛡️ Automated Assumption Diagnostics

Before trusting parametric models, BabySQL automatically evaluates underlying assumptions on the selected variables:
* **Sample Size Check**: Flags small cohorts ($N < 30$).
* **Skewness**: Identifies severe right or left skew ($|\text{Skew}| > 1.0$).
* **Excess Kurtosis**: Detects heavy tails / extreme outliers ($|\text{Kurtosis}| > 2.0$).
* **Jarque-Bera Normality Test**: Combines skewness and kurtosis into a $\chi^2(2)$ statistic with exact $p$-value.
* **Smart Advisory Alert**: When non-normality is detected ($p < 0.05$), BabySQL displays an advisory banner recommending the appropriate non-parametric alternative (e.g. Mann-Whitney $U$ or Kruskal-Wallis).

---

## 📊 Low-Graphic Distribution Graphs

To maintain a featherweight footprint with zero external graphing dependencies, BabySQL features custom, mathematically exact **pure SVG distribution graphics**:

1. **Box & Whisker Plot with Calibrated X-Axis**:
   * Minimum, Lower Quartile ($Q_1$), Median ($Q_2$), Upper Quartile ($Q_3$), Maximum.
   * Tukey 1.5× IQR inner fences with whisker caps.
   * Calibrated X-axis scale line with quantitative tick marks and numerical coordinates.
   * Outlier points with hover tooltips displaying exact values and distance from mean ($Z$-score $\sigma$).
2. **Kernel Density Estimation (KDE) Continuous Distribution**:
   * Continuous Gaussian kernel $K(u) = \frac{1}{\sqrt{2\pi}} e^{-u^2/2}$.
   * Optimal bandwidth selection via **Silverman's Rule of Thumb**: $h = 1.06 \sigma n^{-1/5}$.
   * Calibrated X-axis scale with 5 evenly spaced numerical ticks.
   * Superimposed guidelines for Mean ($\mu$) in emerald and Median ($Med$) in cyan.
   * Empirical $\pm 1\sigma$ standard deviation zone highlight.
   * Interactive hover probe for point-wise continuous value tracking.
3. **Frequency Distribution Histogram**:
   * 8 equidistant bins with mathematically crisp interval notation ($[min, max)$ and $[min, max]$).
   * Count and percentage tags displayed above each bar for immediate visibility.
   * Interval labels and cumulative percentages beneath each bin on the X-axis.
   * Mean and Median reference indicators.

---

## 🎲 Dataset Sampling & Theoretical Simulation

BabySQL includes an integrated sampling and synthetic distribution engine with pure mathematical algorithms:
* **Proportional Stratified Sampling (Hamilton / Largest-Remainder Quota Method)**:
  * Guarantees sample stratum weights ($w_h = n_h / n$) strictly mirror population stratum weights ($W_h = N_h / N$) with zero selection bias.
  * Live interactive allocation breakdown table showing exact population shares vs sample allocations.
  * Supports fixed sample counts or percentage-of-dataset quotas.
* **Equal Stratified Sampling**: Enforces identical sample representation ($n_h = c$) across minority and majority subgroups.
* **Fisher-Yates (Knuth) Unbiased Shuffle**: $O(N)$ random permutation where every outcome is equally likely ($1 / N!$).
* **Bootstrap Resampling**: Independent draws with replacement to empirical confidence bounds.
* **Systematic Interval Sampling**: Every $k$-th record with randomized starting offset.
* **Theoretical Distribution Simulation (via jStat)**: Generates queryable SQLite tables drawn directly from parametric theoretical models in $< 5\text{ms}$:
  * Normal (Gaussian) $\mathcal{N}(\mu, \sigma)$
  * Continuous Uniform $\mathcal{U}(a, b)$
  * Student's $t$ with heavy tails ($df$)
  * Chi-Square $\chi^2(df)$
  * Gamma $\Gamma(k, \theta)$
  * Beta $\text{Beta}(\alpha, \beta)$
  * Exponential $\text{Exp}(\lambda)$

---

## 📑 Executive Report Export & Variable Search

* **Hypothesis Testing Report Export & Copy**:
  * **`Copy Full Report`**: Copies a formatted executive Markdown report directly to your clipboard.
  * **`Download Report (.md)`**: Exports a standalone Markdown report containing the executive verdict, hypotheses ($H_0 / H_a$), assumption diagnostics, parameter metrics, model tables (ANOVA, VIF, Odds Ratios, Confusion Matrix, Cluster Centroids, A/B Lift), and distribution summaries.
  * **`Download JSON`**: Exports raw statistical data structures for programmatic pipeline integration.
* **Descriptive Statistics Profiling Export & Copy**:
  * **`Copy Report`**: Formats and copies a complete profiling summary of the selected column to your clipboard.
  * **`Download (.md)`**: Exports an executive Markdown report containing Five-Number quartile summaries, moments (Mean, Sample Std Dev, Sample Variance with Bessel's correction, Std Error, Skewness, Kurtosis), and full histogram bin distribution tables.
  * **`JSON`**: Exports raw descriptive metrics and bin arrays.
* **Variable Searchbar with Quick Actions**:
  * Real-time column filtering in Hypothesis Studio to effortlessly locate predictors across wide datasets (e.g. 50+ columns).
  * Quick-action **`All`** and **`Clear`** buttons for multi-predictor regression and cluster analysis.

---

## ⚡ SQL Prompt Templates & Shortcuts

The SQL Editor includes one-click prompt templates that automatically inject tailored queries for the active table:
* `📊 Group & Count`: Instant frequency distribution grouped by a column.
* `🔍 Filter WHERE`: Conditional threshold filtering template.
* `🏆 Top 10`: Order and rank top 10 records.
* `📐 Aggregates`: Summary metrics (`COUNT`, `AVG`, `MIN`, `MAX`).
* `✨ Distinct`: Discover unique categorical entities.
* `🛡️ Null Audit`: Data quality audit counting missing values.

---

## 🌓 Minimalist Light & Dark Mode
 
Toggle between dark and light themes with one click in the top navigation bar:
* **Dark Mode (Default)**: Deep slate palette (`#0a0e17` / `#111827`) optimized for extended analytical sessions.
* **Minimalist Light Mode**: Clean high-contrast white & slate-50 design featuring **executive dark blue typography** (`#07152b` / `#0b1f3d` / `#064075`) and deep amber / forest green alerts for sharp readability and presentation.
* Preference is automatically persisted in `localStorage`.

---

## 🎲 Dataset Sampling & Simulation

* **Resample Existing Tables**:
  * Fisher-Yates uniform random sampling.
  * Fixed row count or percentage split.
  * Stratified random sampling across categorical groups.
  * Bootstrap resampling with replacement.
* **Synthetic Distribution Simulation**:
  * Generate synthetic Monte Carlo datasets for Normal, Uniform, Student's $t$, Chi-Square, Gamma, Beta, and Exponential distributions and persist them directly into SQLite.

---

## ⚡ Load Capacity & Benchmarks

| Rows | Ingestion Speed | SQL Execution | Hypothesis Tests | Experience |
| :--- | :--- | :--- | :--- | :--- |
| **100 – 10,000** | **< 100 ms** | < 1 ms | < 2 ms | Instantaneous |
| **10,000 – 100,000** | **~0.5 – 1.5s** | 2 – 15 ms | 5 – 15 ms | Butter-smooth (Sweet Spot) |
| **100,000 – 400,000** | **~3 – 6s** | 20 – 60 ms | 20 – 50 ms | Very practical & responsive |
| **> 800,000** | ~15 – 30s | 100 – 300 ms | ~150 ms | Browser memory limit |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run active SQL query |
| `Ctrl + L` | Clear active SQL query |
| `Click on any cell` | Copies cell value to clipboard with notification |
| `Click column header` | Toggles ascending / descending sort |
| `Escape` | Closes any open modal (Guide, Sampling, CSV Uploader, Shortcuts drawer) |

---

## 📄 License

MIT © [Antarish Deshpande](https://github.com/antarishpdeshpande-cyber)
