# 🍼 BabySQL

<div align="center">

[![GitHub Repo](https://img.shields.io/badge/GitHub-BabySQL-blue?logo=github)](https://github.com/antarishpdeshpande-cyber/BabySQL)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Engine](https://img.shields.io/badge/Engine-SQLite%203%20WASM-cyan.svg)](https://sql.js.org/)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-~1.03%20MB-brightgreen.svg)]()
[![Offline First](https://img.shields.io/badge/Privacy-100%25%20Local%20%26%20Offline-orange.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Windows%20%7C%20CLI-purple.svg)]()

<br />

**An ultra-lightweight, zero-cloud, privacy-first SQLite database studio and CSV ingestion engine with automated statistical profiling.**

*Runs 100% locally inside your browser via WebAssembly SQLite 3. No database servers, no heavy Electron runtimes, zero telemetry.*

[Quickstart](#-quickstart) • [Key Features](#-key-features) • [Sample Mode](#-sample-mode--testing) • [Performance Benchmarks](#-load-capacity--benchmarks) • [Architecture](#-architecture)

</div>

---

## 🌟 Why BabySQL?

Traditional database GUI tools (DBeaver, Beekeeper Studio, DB Browser for SQLite) are either bloated **250MB+ Electron apps**, require native **C++/Java installers**, or look like they were built in 2002. 

**BabySQL** is designed for the modern data practitioner who needs to **drop a CSV, query it with real SQL, inspect statistical distributions, and export a clean SQLite file** in under 3 seconds.

```
┌─────────────────────────────────────────────────────────────┐
│                       BabySQL UI                            │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Schema Tree  │  │  SQL Code Editor │  │ Query History │  │
│  │ & Column Meta│  │  (Ctrl + Enter)  │  │ Dynamic Chips │  │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬───────┘  │
│         │                   │                    │          │
│  ┌──────▼───────────────────▼────────────────────▼───────┐  │
│  │    Dual Workspace: Table Results  |  Stats Profiler   │  │
│  │    - Sorting & Pagination        - Live Histograms    │  │
│  │    - Global Filter & Search      - Central Tendency   │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
             ┌────────────────▼────────────────┐
             │       SQLite 3 WASM Engine      │
             │   (Pure C compiled to WebAssembly)│
             │   100% In-Memory / Local Storage│
             └─────────────────────────────────┘
```

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

### 📊 Automated Statistical Profiler & Histograms
* Instantly profile any numeric or categorical column:
  * **Central Tendency**: Mean (Average), Median (50th percentile), Mode.
  * **Dispersion**: Standard Deviation ($\sigma$), Variance, Min, Max, Range, Sum.
  * **Percentiles & Quartiles**: Q1 (25th %), Q3 (75th %), and Interquartile Range (IQR).
  * **Data Quality**: Total rows, Valid rows, Missing/Null counts, Null percentage, and Unique count.
* **Live Frequency Distribution Histogram**: SVG/CSS bar chart with interactive hover tooltips showing row counts and percentages per bin.
* **Categorical Breakdown**: Frequency bars for top categories in text columns.

### 🧪 Dedicated "Sample Mode"
* Don't have a CSV on hand? Click **`🧪 Sample Mode`** in the header.
* Instantly loads **100 sales orders** (`ecommerce_sales`) and **60 employee records** (`employee_salaries`).
* Activates guided query chips (`Sales by Category`, `Salaries by Dept`, `Top Orders > $500`, `High Performers`).
* Click **`Exit`** anytime to wipe the demo tables and return to a blank workspace.

### 💾 Portability & Export
* **Export `.db` / `.sqlite`**: Save your in-memory SQLite database as a standard binary SQLite file, ready for production backends or Python scripts.
* **Open `.db`**: Load existing `.sqlite` or `.db` files from your computer.
* **Export Results**: Download filtered SQL query results to **CSV** or **JSON**.

---

## 🚀 Quickstart

### 1. The Easiest Way (Windows 1-Click)
In the project directory, simply double-click **`run.bat`**.
* Launches the local server and opens [http://localhost:3000](http://localhost:3000) in your browser.
* *(Tip)*: Right-click `run.bat` → *Send to* → *Desktop (create shortcut)* for a permanent desktop icon!

---

### 2. Run via Node.js CLI / NPX

You can run BabySQL locally using the bundled CLI runner:

```bash
# Start directly with Node
node ./bin/babysql.js

# Or with custom port
node ./bin/babysql.js --port 8080
```

*(When published to npm, you can run `npx babysql` on any machine with zero installation).*

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

# Build the ultra-compact production bundle (~1 MB)
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

| Rows | CSV Size | Ingestion Speed | SQL Execution | Statistical Profiling | Experience |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 – 10,000** | < 2 MB | **< 100 ms** | < 1 ms | < 5 ms | Instantaneous |
| **10,000 – 100,000** | 2 MB – 25 MB | **~0.5 – 1.5s** | 2 – 15 ms | 15 – 30 ms | Butter-smooth (Sweet Spot) |
| **100,000 – 400,000** | 25 MB – 80 MB | **~3 – 6s** | 20 – 60 ms | 60 – 150 ms | Very practical & responsive |
| **> 800,000** | > 150 MB | ~15 – 30s | 100 – 300 ms | ~400 ms | Browser heap ceiling |

---

## 📁 Pre-packaged Sample Datasets

Located in the `samples/` directory for immediate testing:

* [`samples/ecommerce_sales.csv`](samples/ecommerce_sales.csv): **100 rows** of order IDs, customer names, product categories, prices, quantities, discounts, total revenue, ratings, and delivery days.
* [`samples/employee_salaries.csv`](samples/employee_salaries.csv): **60 rows** of employee IDs, departments, job titles, experience years, base salaries, bonus percentages, and performance scores.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run active SQL query |
| `Click on any cell` | Copies cell value to clipboard with confirmation |
| `Click column header` | Toggles ascending / descending sort |
| `Escape` | Closes CSV uploader modal |

---

## 🛠️ Tech Stack

* **SQLite Engine**: [`sql.js`](https://sql.js.org/) (Official WebAssembly port of SQLite 3.x)
* **Frontend**: React 18, TypeScript, Tailwind CSS
* **CSV Engine**: [`PapaParse`](https://www.papaparse.com/) (Streaming chunked CSV parser)
* **Icons**: [`lucide-react`](https://lucide.dev/)
* **Bundler**: Vite 4

---

## 📄 License

MIT © [Antarish Deshpande](https://github.com/antarishpdeshpande-cyber)
