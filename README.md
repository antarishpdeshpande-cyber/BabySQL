# 🍼 BabySQL

<div align="center">

[![GitHub Repo](https://img.shields.io/badge/GitHub-BabySQL-blue?logo=github)](https://github.com/antarishpdeshpande-cyber/BabySQL)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Engine](https://img.shields.io/badge/Engine-SQLite%203%20WASM-cyan.svg)](https://sql.js.org/)
[![Stats Engine](https://img.shields.io/badge/Stats-jStat%20%7C%20simple--statistics-blueviolet.svg)]()
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-~1.09%20MB-brightgreen.svg)]()
[![Offline First](https://img.shields.io/badge/Privacy-100%25%20Local%20%26%20Offline-orange.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Windows%20%7C%20CLI-purple.svg)]()

<br />

**An ultra-lightweight, zero-cloud, privacy-first SQLite database studio, CSV ingestion engine, and business hypothesis testing suite.**

*Runs 100% locally inside your browser via WebAssembly SQLite 3. No database servers, no heavy 300MB Electron runtimes, zero cloud telemetry, and instant sub-2ms statistical calculations.*

[Quickstart](#-quickstart) • [Key Features](#-key-features) • [Hypothesis Testing](#-hypothesis-testing--business-models) • [Sampling & Simulation](#-dataset-sampling--simulation) • [When-to-Use Guide](#-statistical-decision-guide) • [Benchmarks](#-load-capacity--benchmarks)

</div>

---

## 🌟 Why BabySQL?

Traditional database GUI tools (DBeaver, Beekeeper Studio, DB Browser for SQLite) are either bloated **250MB+ Electron apps** or require native **C++/Java installers**. Meanwhile, business analysts and product managers who need to run A/B test $t$-tests, ANOVA, or regressions are forced into cumbersome Excel plugins, paid SPSS licenses, or heavy Python Jupyter environments.

**BabySQL** delivers a unified, zero-friction workspace:
1. **Drop any CSV** into your browser.
2. **Query it with pure SQLite 3 SQL** with instant sorting, filtering, and pagination.
3. **Run rigorous business hypothesis tests** ($t$-tests, ANOVA, $\chi^2$, OLS Regression) with **automated plain-English executive summaries**.
4. **Sample & simulate distributions** using the **Fisher-Yates shuffle** or **jStat theoretical distributions**.
5. **Export a clean, production-ready `.sqlite` binary** in under 3 seconds.

```
┌───────────────────────────────────────────────────────────────────────┐
│                              BabySQL UI                               │
│  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │ Schema Tree  │  │  SQL Code Editor │  │  ⚡ Sampling & Sim      │  │
│  │ & Column Meta│  │  (Ctrl + Enter)  │  │  Fisher-Yates / jStat   │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────────┬────────────┘  │
│         │                   │                         │               │
│  ┌──────▼───────────────────▼─────────────────────────▼────────────┐  │
│  │  Tri-Workspace: Table Results | Column Stats | Hypothesis Studio │  │
│  │  - Sort & Paginate     - Live Histograms     - A/B Welch's t    │  │
│  │  - Cell Copy to Clip   - IQR & Boxplot math  - ANOVA / χ² / OLS │  │
│  │  - CSV / JSON Export   - Data Quality Profil - Plain-English MBA│  │
│  └──────────────────────────┬──────────────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
             ┌────────────────▼────────────────┐
             │       SQLite 3 WASM Engine      │
             │   (Pure C compiled to WebAssembly)│
             │   100% In-Memory / Local Storage│
             └─────────────────────────────────┘
```

---

## 🚀 Quickstart (Totally Standalone — Zero Setup)

BabySQL is designed to run **100% standalone** out of the box with **zero build steps** and **no required npm packages**:

### Option 1: Windows (One-Click)
Simply double-click **`run.bat`** in the repository root.
* Automatically finds Node.js or Python.
* Uses the pre-compiled, self-contained `dist/` bundle.
* Launches [http://localhost:3000](http://localhost:3000) directly in your browser.

### Option 2: macOS / Linux (One-Click)
```bash
chmod +x run.sh
./run.sh
```

### Option 3: Python (Zero Node.js Required)
```bash
python serve.py
```

### Option 4: Node.js (Zero npm install Required)
```bash
node bin/babysql.js
```

*(If you are modifying the source code: run `npm install` followed by `npm run dev`.)*

---

## ✨ Key Features

### 📥 Instant Drag-and-Drop CSV Ingestion
* Drag & drop any `.csv` or `.tsv` file.
* **Automatic Column Type Inference**: Analyzes row values on the fly to detect `INTEGER`, `REAL`, `BOOLEAN`, and `TEXT`.
* **High-Speed Batch Inserts**: Executes inserts inside SQLite `BEGIN TRANSACTION ... COMMIT` blocks, importing 50,000 rows in ~1 second.
* Automatic SQL identifier sanitization for table and column names.

### ⚡ Interactive SQL Studio
* Monospace query editor with line numbers, auto-indent, and `Ctrl + Enter` (or `Cmd + Enter`) execution.
* **Dynamic Table Shortcuts**: When you load a table, query chips automatically adapt to that table (`Preview table`, `Count Rows`, `Schema Info`, `Sorted 25`).
* Query execution timer with millisecond precision and detailed error diagnostics.

---

## 🧪 Hypothesis Testing & Business Models

BabySQL includes an integrated statistical inference studio powered by **`jstat`** and **`simple-statistics`**, computing exact distribution CDFs, quantiles, and $p$-values in **under 2 milliseconds**:

| Test / Model | Primary Business Question | Key Outputs |
| :--- | :--- | :--- |
| **Two-Sample Welch's $t$-Test** | Did Variant B generate higher revenue or conversions than Variant A (A/B testing)? | $t$-statistic, $p$-value, Welch's $df$, 95% CI of difference, Cohen's $d$ effect size |
| **One-Sample $t$-Test** | Does our team's resolution time or CSAT significantly deviate from our SLA benchmark? | $t$-stat, $p$-value, sample mean vs benchmark target, 95% Confidence Interval |
| **Paired Samples $t$-Test** | Did employee output or customer satisfaction improve after training (before vs after)? | Mean difference, $t$-stat, $p$-value, effect size |
| **One-Way ANOVA ($F$-Test)** | Does average store revenue differ across our 4 regional territories or marketing channels? | Between/Within variance, $F$-ratio, $p$-value, $\eta^2$ (Eta-squared variance explained) |
| **Chi-Square Independence ($\chi^2$)** | Is customer churn dependent on payment method or subscription tier? | Contingency matrix, observed vs expected counts, $\chi^2$, $p$-value, Cramér's $V$ |
| **Pearson Correlation** | Does ad spend have a positive, negative, or neutral correlation with conversions? | Correlation coefficient ($r$), $t$-stat, $p$-value, shared variance ($r^2$) |
| **OLS Linear Regression** | How many dollars in revenue do we gain for every additional $1 spent on Google Ads? | Coefficients ($\beta_0, \beta_1$), Standard Errors, $t$-values, $p$-values, $R^2$, Model $F$-test |
| **Mann-Whitney $U$ Test** | How do we compare cohorts when data is heavily skewed or non-normal? | $U$-statistic, standardized $Z$-score, $p$-value, median comparisons |

### 📝 Automated Executive Business Narratives
Every statistical test generates a **clear, MBA-level plain-English narrative** translating raw math into actionable business advice:
> *"We reject the null hypothesis (p = 0.0142 < 0.05). There is a statistically significant difference in revenue between 'Variant A' and 'Variant B'. Group 'Variant B' averages $24.50 higher than 'Variant A' (18.4% lift), representing a moderate effect size (Cohen's d = 0.62)."*

---

## 🎲 Dataset Sampling & Simulation

BabySQL provides built-in sampling to test small-sample behavior, simulate theoretical scenarios, and generate balanced cohorts:

### 1. Resample Existing Tables
* **Fisher-Yates Shuffle**: In-place $O(N)$ mathematically unbiased uniform random permutation.
* **Fixed Sample Size ($N$)** or **Percentage (%)**: Extract representative subsets of any table.
* **Stratified Random Sampling**: Balances sample sizes across categorical groups (e.g., exactly 25 rows per department or variant).
* **Bootstrap Resampling**: Resampling with replacement to construct empirical confidence intervals.
* **Systematic Sampling**: Samples every $k$-th record in sequence.

### 2. Theoretical Distribution Simulations (jStat Generators)
Generate synthetic Monte Carlo datasets and save them directly as SQLite tables:
* **Normal (Gaussian)**: $\text{Normal}(\mu, \sigma)$ bell curve (e.g. simulated heights, test scores, error rates).
* **Uniform**: $\text{Uniform}(a, b)$ flat probability range.
* **Student's $t$**: $\text{Student-}t(df)$ heavy-tailed distribution.
* **Chi-Square**: $\chi^2(df)$ skewed variance distribution.
* **Gamma & Beta**: Distribution of rates, waiting times, and bounded proportions.
* **Exponential**: $\text{Exponential}(\lambda)$ inter-arrival times.

---

## 📖 Statistical Decision Guide

Click **`📖 Stats Guide`** in the top bar to open the built-in **Executive Statistical Handbook & Decision Tree**:
* **"Which test should I pick?"** decision matrix based on your research objective.
* Data requirements (continuous vs categorical variables, sample size minimums).
* Underlying assumptions (normality, independence, homoscedasticity, Cochran's condition).
* How to interpret outputs ($p$-values, confidence intervals, effect sizes).

---

## 🚀 Quickstart

### 1. The Easiest Way (Windows 1-Click)
In the project directory, simply double-click **`run.bat`**.
* Auto-detects Node.js or Python.
* Launches the local server and opens [http://localhost:3000](http://localhost:3000) in your browser.
* *(Tip)*: Right-click `run.bat` → *Send to* → *Desktop (create shortcut)* for a permanent desktop icon!

---

### 2. Run via Node.js CLI / NPX

You can run BabySQL locally using the bundled CLI runner:

```bash
# Start directly with Node
node ./bin/babysql.js

# Or specify a custom port
node ./bin/babysql.js --port 8080
```

*(When published to npm, run `npx babysql` on any machine with zero installation).*

---

### 3. Developer Workflow (Vite + React)

```bash
# Clone the repository
git clone https://github.com/antarishpdeshpande-cyber/BabySQL.git
cd BabySQL

# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Build the ultra-compact production bundle (~1.09 MB)
npm run build
```

---

### 4. Zero-Node Python Launcher

BabySQL also includes a standalone Python 3 runner that requires zero Node runtime:

```bash
python serve.py
```

---

## 🖥️ Install as a Native Desktop App (PWA)

BabySQL is a Progressive Web App (PWA):
1. Open [http://localhost:3000](http://localhost:3000) in **Google Chrome** or **Microsoft Edge**.
2. Click the **"Install BabySQL"** icon in the right side of the address bar.
3. BabySQL opens in its own **frameless desktop window** and pins to your Windows taskbar.

---

## ⚡ Load Capacity & Benchmarks

| Rows | CSV Size | Ingestion Speed | SQL Execution | Hypothesis Tests | Experience |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 – 10,000** | < 2 MB | **< 100 ms** | < 1 ms | < 2 ms | Instantaneous |
| **10,000 – 100,000** | 2 MB – 25 MB | **~0.5 – 1.5s** | 2 – 15 ms | 5 – 15 ms | Butter-smooth (Sweet Spot) |
| **100,000 – 400,000** | 25 MB – 80 MB | **~3 – 6s** | 20 – 60 ms | 20 – 50 ms | Very practical & responsive |
| **> 800,000** | > 150 MB | ~15 – 30s | 100 – 300 ms | ~150 ms | Browser heap ceiling |

---

## 📁 Pre-packaged Sample Datasets

Located in the `samples/` directory for immediate testing:

* [`samples/ecommerce_sales.csv`](samples/ecommerce_sales.csv): **100 rows** of order IDs, customer names, product categories, prices, quantities, discounts, total revenue, ratings, and delivery days.
* [`samples/employee_salaries.csv`](samples/employee_salaries.csv): **60 rows** of employee IDs, departments, job titles, experience years, base salaries, bonus percentages, and performance scores.
* [`samples/ab_test_experiment.csv`](samples/ab_test_experiment.csv): **100 rows** of user IDs, test variants (Control vs Treatment), devices, time spent, pages viewed, conversions, and revenue.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run active SQL query |
| `Click on any cell` | Copies cell value to clipboard with confirmation |
| `Click column header` | Toggles ascending / descending sort |
| `Escape` | Closes any open modal (CSV Uploader, Sampling, Guide) |

---

## 🛠️ Tech Stack & Optimization

* **SQLite Engine**: [`sql.js`](https://sql.js.org/) (Official WebAssembly port of SQLite 3.x)
* **Statistical Inference**: [`jstat`](https://github.com/jstat/jstat) (Exact CDFs, PDFs, Student-t, Chi-square, Fisher's F)
* **Mathematical Modeling**: [`simple-statistics`](https://simplestatistics.org/) (OLS linear regression, correlation)
* **Frontend**: React 18, TypeScript, Tailwind CSS
* **CSV Engine**: [`PapaParse`](https://www.papaparse.com/) (Streaming chunked CSV parser)
* **Icons**: [`lucide-react`](https://lucide.dev/)
* **Bundler**: Vite 4 (Production build: **~412 kB JS / 126 kB gzipped**)

---

## 📄 License

MIT © [Antarish Deshpande](https://github.com/antarishpdeshpande-cyber)
