# 🍼 BabySQL

> **Ultra-lightweight, local-first SQLite query studio and CSV ingestion engine with automated statistical profiling.**

BabySQL is a privacy-first, zero-cloud data workbench designed for local data exploration, CSV ingestion, SQL querying, and descriptive statistical analysis. It runs entirely inside your local browser via WebAssembly-compiled SQLite 3 (`sql.js`), meaning **zero data ever leaves your computer**.

---

## ✨ Key Features

- **⚡ Blazing Fast & Ultra-Lightweight**:
  - Total production bundle is **~1.2 MB** (orders of magnitude smaller than 200MB+ Electron database apps).
  - Sub-second startup time.
- **📥 Instant Drag-and-Drop CSV Ingestion**:
  - Drag & drop any `.csv` or `.tsv` file.
  - Automatic column header sanitization and data type inference (`INTEGER`, `REAL`, `TEXT`, `BOOLEAN`).
  - High-speed batch transaction import (`BEGIN TRANSACTION ... COMMIT`).
- **💻 Interactive SQL Query Studio**:
  - Clean monospace query editor with keyboard shortcuts (`Ctrl + Enter` / `Cmd + Enter` to execute).
  - Quick query chips for instant aggregations, joins, and schemas.
  - Query execution timers and error diagnostics.
- **📊 Statistical Analysis & Profiling**:
  - Automated descriptive statistics on any column or query result:
    - Central tendency: **Mean**, **Median**, **Mode**
    - Dispersion: **Standard Deviation (σ)**, **Variance**, **Min**, **Max**, **Sum**
    - Percentiles: **Q1 (25%)**, **Q3 (75%)**, **Interquartile Range (IQR)**
    - Quality metrics: **Null count**, **Missing percentage**, **Unique count**
  - **Visual Frequency Distribution Histogram** with interactive tooltips.
  - Categorical frequency distribution breakdown for text fields.
- **🗃️ Database Portability**:
  - **Export `.db` / `.sqlite`**: Save your work as a standard binary SQLite database file.
  - **Open `.db`**: Load existing SQLite database files from disk.
  - **Export Results**: Download filtered query results as CSV or JSON.
- **🖥️ Run as a Desktop App (PWA)**:
  - Installable in 1-click via Chrome or Edge to run in a standalone desktop window without browser bars.
  - Also includes a zero-dependency Python launcher (`serve.py`).

---

## 🚀 Quick Start

### Option 1: Standard Development Server (Node.js)

```bash
# Navigate to BabySQL directory
cd BabySQL

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Option 2: Standalone Production Build

```bash
# Build the static distribution (~1.2 MB)
npm run build

# Preview locally
npm run preview
# OR launch with Python without Node:
python serve.py
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run active SQL query |
| Click Cell | Copy cell value to clipboard |
| Column Header Click | Sort column ascending / descending |

---

## 🏗️ Architecture

BabySQL is engineered to be strictly local and minimalist:
- **Core Engine**: `sql.js` (WebAssembly compiled SQLite 3.x)
- **CSV Parser**: `papaparse` (streaming chunk parser)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Icons**: `lucide-react`
- **Zero Cloud**: 100% offline and sandboxed in client memory.

---

*Part of the Pinaka360 Workspace portfolio.*
