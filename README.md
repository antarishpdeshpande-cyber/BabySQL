# 🍼 BabySQL Enterprise BRM Platform

<div align="center">

[![GitHub Repo](https://img.shields.io/badge/GitHub-BabySQL-blue?logo=github)](https://github.com/antarishpdeshpande-cyber/BabySQL)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Engine](https://img.shields.io/badge/Engine-SQLite%203%20WASM-cyan.svg)](https://sql.js.org/)
[![Stats Engine](https://img.shields.io/badge/Stats-Pure%20TS%20%7C%20jStat%20%7C%20simple--statistics-blueviolet.svg)]()
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-473%20kB%20(143%20kB%20gzipped)-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20%26%20Offline-orange.svg)]()
[![Design](https://img.shields.io/badge/Theme-Dark%20%7C%20Minimalist%20Light-teal.svg)]()

<br />

**An ultra-lightweight, zero-cloud, privacy-first SQLite database studio, CSV ingestion engine, and Enterprise Business Research Methods (BRM) decision platform.**

*Runs 100% locally inside your browser via WebAssembly SQLite 3. No database servers, no heavy Electron runtimes, zero cloud telemetry, instant sub-5ms statistical calculations, and standalone execution via `run.bat`.*

[Quickstart](#-quickstart-totally-standalone) • [Which Test to Use](#-data-types--business-use-cases) • [Statistical Models](#-15-enterprise-brm-statistical-models) • [Assumption Diagnostics](#-automated-assumption-diagnostics) • [Low-Graphic Visualizations](#-low-graphic-distribution-graphs) • [Sampling & Simulation](#-dataset-sampling--simulation) • [Benchmarks](#-load-capacity--benchmarks)

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

## 🧪 15 Enterprise BRM Statistical Models

All models execute in client-side WebAssembly / TypeScript in **under 5 milliseconds** and generate executive plain-English summaries with actionable business takeaways:

### 1. Means & Group Comparisons
* **Two-Sample Welch's $t$-Test**: Unpaired test robust to unequal variances. Yields $t$-stat, Welch-Satterthwaite $df$, $p$-value, Cohen's $d$, and 95% Confidence Interval.
* **One-Sample $t$-Test**: Tests sample mean against an external target/SLA benchmark.
* **Paired Samples $t$-Test**: Within-subject before vs after interventions with difference scores.
* **One-Way ANOVA ($F$-Test)**: Multi-group variance decomposition ($SS_{\text{between}} / SS_{\text{within}}$), $F$-ratio, and $\eta^2$ effect size.

### 2. Categorical & Proportions
* **Two-Sample $Z$-Test of Proportions**: High-precision A/B testing comparing conversion rates ($p_1$ vs $p_2$). Outputs pooled variance $Z$-score, risk difference 95% CI, and percentage lift.
* **Chi-Square Test of Independence ($\chi^2$)**: Contingency table analysis testing association between two categorical factors, with Cramér's $V$ and Cochran's rule validation.
* **Chi-Square Goodness of Fit**: Tests categorical distribution against theoretical or equal frequencies.

### 3. Predictive & Multivariate Modeling
* **Multiple Linear Regression (Multivariate OLS)**: Predicts a continuous outcome from multiple numerical predictors. Calculates regression coefficients ($\beta_j$), standard errors, $t$-values, $p$-values, $R^2$, Adjusted $R^2$, ANOVA model $F$-test, and **Variance Inflation Factors (VIF)** for multicollinearity detection.
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

1. **Box & Whisker Plot**:
   * Minimum, Lower Quartile ($Q_1$), Median ($Q_2$), Upper Quartile ($Q_3$), Maximum.
   * Tukey 1.5× IQR inner fences with whisker caps.
   * Outlier dots plotted individually beyond the fences.
2. **Kernel Density Estimation (KDE) Continuous Curve**:
   * Continuous Gaussian kernel $K(u) = \frac{1}{\sqrt{2\pi}} e^{-u^2/2}$.
   * Optimal bandwidth selection via **Silverman's Rule of Thumb**: $h = 0.9 \min(\sigma, \frac{\text{IQR}}{1.34}) n^{-1/5}$.
   * Smooth SVG density fill with mean reference line.
3. **Frequency Histogram**:
   * Equidistant bin distribution with bin counts and interactive hover tooltips.

---

## 🌓 Minimalist Light & Dark Mode
 
Toggle between dark and light themes with one click in the top navigation bar:
* **Dark Mode (Default)**: Deep slate palette (`#0a0e17` / `#111827`) optimized for extended analytical sessions.
* **Minimalist Light Mode**: Clean high-contrast white & slate-50 design featuring **executive dark blue typography** (`#07152b` / `#0b1f3d` / `#064075`) for sharp readability and presentation.
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
| `Click on any cell` | Copies cell value to clipboard with notification |
| `Click column header` | Toggles ascending / descending sort |
| `Escape` | Closes any open modal (Guide, Sampling, CSV Uploader) |

---

## 📄 License

MIT © [Antarish Deshpande](https://github.com/antarishpdeshpande-cyber)
