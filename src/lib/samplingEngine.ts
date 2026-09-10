import { getDatabase } from './sqliteEngine';
import pkg from 'jstat';

const jStat = (pkg as any).jStat || pkg;

export interface SamplingConfig {
  sourceTable: string;
  targetTable: string;
  method: 'random_count' | 'random_pct' | 'stratified' | 'systematic' | 'bootstrap';
  count?: number;
  percentage?: number;
  stratifyColumn?: string;
  stratifiedAllocation?: 'proportional' | 'equal';
  stratifiedTotalCount?: number;
  stratifiedPercentage?: number;
  countPerStratum?: number;
  stepK?: number;
}

export interface StratumAllocationInfo {
  stratum: string;
  populationSize: number;
  populationShare: number; // 0 to 1
  sampleSize: number;
  sampleShare: number; // 0 to 1
}

export interface DistributionSamplingConfig {
  targetTable: string;
  distribution: 'normal' | 'uniform' | 'studentt' | 'chisquare' | 'gamma' | 'beta' | 'exponential';
  sampleSize: number;
  param1: number; // mean / min / df / shape / alpha / rate
  param2?: number; // stdDev / max / scale / beta
}

/**
 * Fisher-Yates (Knuth) Shuffle Algorithm.
 * Performs an in-place, unbiased O(N) random permutation of an array.
 * Every permutation is generated with equal probability (1 / N!).
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    // Generate uniform random integer in [0, i]
    const j = Math.floor(Math.random() * (i + 1));
    // Swap arr[i] and arr[j]
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Computes proportional allocation of sample sizes across strata using
 * the Hare-Niemeyer / Hamilton largest remainder quota method.
 * Mathematically guarantees that sample stratum proportions (w_h = n_h / n)
 * mirror population stratum proportions (W_h = N_h / N) with minimal distortion,
 * and sum(n_h) strictly equals target sample size n.
 */
export function computeProportionalAllocation(
  strataSizes: Map<string, number>,
  targetTotal: number
): Map<string, number> {
  const totalPop = Array.from(strataSizes.values()).reduce((a, b) => a + b, 0);
  if (totalPop === 0 || targetTotal <= 0) return new Map();

  const clampedTarget = Math.min(targetTotal, totalPop);
  const allocation = new Map<string, number>();
  const remainders: { key: string; rem: number; max: number }[] = [];

  let allocatedSum = 0;

  strataSizes.forEach((popSize, key) => {
    if (popSize <= 0) {
      allocation.set(key, 0);
      return;
    }
    const exactQuota = (clampedTarget * popSize) / totalPop;
    let base = Math.floor(exactQuota);
    // Guarantee at least 1 row per stratum if target is sufficient
    if (base === 0 && clampedTarget >= strataSizes.size) {
      base = 1;
    }
    base = Math.min(base, popSize);
    allocation.set(key, base);
    allocatedSum += base;
    remainders.push({
      key,
      rem: exactQuota - Math.floor(exactQuota),
      max: popSize,
    });
  });

  // Largest remainder method: distribute leftover slots to strata with largest remainders
  let deficit = clampedTarget - allocatedSum;
  if (deficit > 0) {
    remainders.sort((a, b) => b.rem - a.rem);
    for (const item of remainders) {
      if (deficit <= 0) break;
      const current = allocation.get(item.key) || 0;
      if (current < item.max) {
        allocation.set(item.key, current + 1);
        deficit--;
      }
    }
  } else if (deficit < 0) {
    // If over-allocated due to base=1 guarantees
    remainders.sort((a, b) => a.rem - b.rem);
    for (const item of remainders) {
      if (deficit >= 0) break;
      const current = allocation.get(item.key) || 0;
      if (current > 1) {
        allocation.set(item.key, current - 1);
        deficit++;
      }
    }
  }

  return allocation;
}

/**
 * Bootstrap Resampling (Sampling with replacement).
 * Each draw is independent with probability 1/N.
 */
export function bootstrapResample<T>(array: T[], sampleSize: number): T[] {
  if (array.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * array.length);
    result.push(array[idx]);
  }
  return result;
}

/**
 * Executes sampling on a SQLite table and stores the result as a new table.
 */
export function generateSampleTable(config: SamplingConfig): { tableName: string; rowCount: number } {
  const {
    sourceTable,
    targetTable,
    method,
    count = 50,
    percentage = 20,
    stratifyColumn,
    stratifiedAllocation = 'proportional',
    stratifiedTotalCount,
    stratifiedPercentage,
    countPerStratum = 15,
    stepK = 5,
  } = config;

  if (!sourceTable) {
    throw new Error('Source table must be specified.');
  }

  const finalTableName = targetTable.trim() || `${sourceTable}_sample`;

  const db = getDatabase();
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }

  // 1. Fetch table schema
  const infoRes = db.exec(`PRAGMA table_info("${sourceTable}");`);
  if (!infoRes || infoRes.length === 0 || !infoRes[0].values) {
    throw new Error(`Table "${sourceTable}" does not exist.`);
  }

  const colDefs = infoRes[0].values
    .map((col: any) => `"${col[1]}" ${col[2] || 'TEXT'}`)
    .join(', ');

  // 2. Fetch all source rows
  const dataRes = db.exec(`SELECT * FROM "${sourceTable}";`);
  if (!dataRes || dataRes.length === 0 || !dataRes[0].values) {
    throw new Error(`Table "${sourceTable}" contains no records to sample.`);
  }

  const columns = dataRes[0].columns;
  const rows = dataRes[0].values;

  if (rows.length === 0) {
    throw new Error(`Table "${sourceTable}" is empty.`);
  }

  let sampled: any[][] = [];

  switch (method) {
    case 'random_count': {
      // Fisher-Yates random shuffle -> take first N
      const shuffled = fisherYatesShuffle(rows);
      sampled = shuffled.slice(0, Math.min(count, rows.length));
      break;
    }

    case 'random_pct': {
      // Percentage via Fisher-Yates
      const targetCount = Math.max(1, Math.round((rows.length * Math.min(100, Math.max(1, percentage))) / 100));
      const shuffled = fisherYatesShuffle(rows);
      sampled = shuffled.slice(0, Math.min(targetCount, rows.length));
      break;
    }

    case 'stratified': {
      if (!stratifyColumn) {
        throw new Error('Stratification requires a categorical column.');
      }
      const stratIdx = columns.indexOf(stratifyColumn);
      if (stratIdx === -1) {
        throw new Error(`Stratification column "${stratifyColumn}" not found in table.`);
      }

      // Group rows by stratum
      const strataMap = new Map<string, any[][]>();
      const strataSizes = new Map<string, number>();
      for (const row of rows) {
        const key = String(row[stratIdx] ?? 'NULL');
        if (!strataMap.has(key)) strataMap.set(key, []);
        strataMap.get(key)!.push(row);
        strataSizes.set(key, (strataSizes.get(key) || 0) + 1);
      }

      sampled = [];

      if (stratifiedAllocation === 'proportional') {
        // Proportional allocation: n_h = n * (N_h / N)
        const targetN = stratifiedPercentage !== undefined
          ? Math.max(1, Math.round((rows.length * Math.min(100, Math.max(1, stratifiedPercentage))) / 100))
          : Math.max(1, Math.min(rows.length, stratifiedTotalCount || count || 100));

        const allocationMap = computeProportionalAllocation(strataSizes, targetN);

        strataMap.forEach((stratumRows, stratumKey) => {
          const allocCount = allocationMap.get(stratumKey) || 0;
          if (allocCount > 0) {
            const shuffledStratum = fisherYatesShuffle(stratumRows);
            const countToTake = Math.min(allocCount, shuffledStratum.length);
            for (let i = 0; i < countToTake; i++) {
              sampled.push(shuffledStratum[i]);
            }
          }
        });
      } else {
        // Equal allocation: fixed count per stratum
        const perStratum = countPerStratum || 15;
        strataMap.forEach((stratumRows) => {
          const shuffledStratum = fisherYatesShuffle(stratumRows);
          const countToTake = Math.min(perStratum, stratumRows.length);
          for (let i = 0; i < countToTake; i++) {
            sampled.push(shuffledStratum[i]);
          }
        });
      }

      // Final Fisher-Yates shuffle so categories are evenly dispersed
      sampled = fisherYatesShuffle(sampled);
      break;
    }

    case 'bootstrap': {
      // Resampling with replacement
      sampled = bootstrapResample(rows, count);
      break;
    }

    case 'systematic': {
      const k = Math.max(2, stepK);
      // Random starting offset in [0, k-1]
      const offset = Math.floor(Math.random() * k);
      sampled = [];
      for (let i = offset; i < rows.length; i += k) {
        sampled.push(rows[i]);
      }
      break;
    }

    default:
      throw new Error(`Unknown sampling method: ${method}`);
  }

  // 3. Create destination table and insert sampled rows in a single transaction
  db.run(`DROP TABLE IF EXISTS "${finalTableName}";`);
  db.run(`CREATE TABLE "${finalTableName}" (${colDefs});`);

  if (sampled.length > 0) {
    db.run('BEGIN TRANSACTION;');
    const placeholders = columns.map(() => '?').join(',');
    const stmt = db.prepare(`INSERT INTO "${finalTableName}" VALUES (${placeholders});`);
    for (const row of sampled) {
      stmt.run(row);
    }
    stmt.free();
    db.run('COMMIT;');
  }

  return {
    tableName: finalTableName,
    rowCount: sampled.length,
  };
}

/**
 * Generates synthetic sample data drawn from theoretical probability distributions via jStat.
 */
export function generateDistributionSampleTable(
  config: DistributionSamplingConfig
): { tableName: string; rowCount: number } {
  const { targetTable, distribution, sampleSize = 500, param1, param2 = 1 } = config;
  const db = getDatabase();
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }

  const finalTableName = targetTable.trim() || `sim_${distribution}_${sampleSize}`;
  const n = Math.max(1, Math.min(50000, sampleSize));

  let values: number[] = [];
  switch (distribution) {
    case 'normal': {
      const dist = jStat.normal(param1, Math.max(0.0001, param2));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'uniform': {
      const minVal = Math.min(param1, param2);
      const maxVal = Math.max(param1, param2);
      const dist = jStat.uniform(minVal, maxVal);
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'studentt': {
      const dist = jStat.studentt(Math.max(1, param1));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'chisquare': {
      const dist = jStat.chisquare(Math.max(1, param1));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'gamma': {
      const dist = jStat.gamma(Math.max(0.01, param1), Math.max(0.01, param2));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'beta': {
      const dist = jStat.beta(Math.max(0.01, param1), Math.max(0.01, param2));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    case 'exponential': {
      const dist = jStat.exponential(Math.max(0.001, param1));
      values = Array.from({ length: n }, () => dist.sample());
      break;
    }
    default:
      throw new Error(`Unsupported distribution: ${distribution}`);
  }

  // Create table
  db.run(`DROP TABLE IF EXISTS "${finalTableName}";`);
  db.run(`CREATE TABLE "${finalTableName}" (
    sample_id INTEGER PRIMARY KEY,
    simulated_value REAL,
    distribution_type TEXT
  );`);

  // Insert sampled values
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare(`INSERT INTO "${finalTableName}" VALUES (?, ?, ?);`);
  for (let i = 0; i < values.length; i++) {
    stmt.run([i + 1, Number(values[i].toFixed(4)), distribution]);
  }
  stmt.free();
  db.run('COMMIT;');

  return {
    tableName: finalTableName,
    rowCount: values.length,
  };
}

/**
 * Queries SQLite once to retrieve population stratum frequencies.
 */
export function getStrataPopulationSizes(
  tableName: string,
  stratifyColumn: string
): Map<string, number> {
  const db = getDatabase();
  if (!db || !tableName || !stratifyColumn) return new Map();

  try {
    const res = db.exec(`SELECT "${stratifyColumn}", COUNT(*) FROM "${tableName}" GROUP BY "${stratifyColumn}";`);
    if (!res || res.length === 0 || !res[0].values) return new Map();

    const strataSizes = new Map<string, number>();
    for (const row of res[0].values) {
      const key = String(row[0] ?? 'NULL');
      const count = Number(row[1]) || 0;
      strataSizes.set(key, count);
    }
    return strataSizes;
  } catch (err) {
    console.error('getStrataPopulationSizes error:', err);
    return new Map();
  }
}

/**
 * Pure in-memory calculation of stratum sample allocation breakdown.
 * Executes in < 0.01ms with zero database queries.
 */
export function computeStratumBreakdownFromPop(
  strataSizes: Map<string, number>,
  allocation: 'proportional' | 'equal',
  targetTotalOrCount: number,
  isPercentage = false
): StratumAllocationInfo[] {
  if (!strataSizes || strataSizes.size === 0) return [];

  let totalPop = 0;
  strataSizes.forEach((count) => {
    totalPop += count;
  });

  if (totalPop === 0) return [];

  let sampleSizes = new Map<string, number>();
  if (allocation === 'proportional') {
    const targetN = isPercentage
      ? Math.max(1, Math.round((totalPop * Math.min(100, Math.max(1, targetTotalOrCount))) / 100))
      : Math.max(1, Math.min(totalPop, targetTotalOrCount));
    sampleSizes = computeProportionalAllocation(strataSizes, targetN);
  } else {
    strataSizes.forEach((pop, key) => {
      sampleSizes.set(key, Math.min(pop, Math.max(1, targetTotalOrCount)));
    });
  }

  const totalSample = Array.from(sampleSizes.values()).reduce((a, b) => a + b, 0);

  const result: StratumAllocationInfo[] = [];
  strataSizes.forEach((popSize, stratum) => {
    const n_h = sampleSizes.get(stratum) || 0;
    result.push({
      stratum,
      populationSize: popSize,
      populationShare: totalPop > 0 ? popSize / totalPop : 0,
      sampleSize: n_h,
      sampleShare: totalSample > 0 ? n_h / totalSample : 0,
    });
  });

  return result.sort((a, b) => b.populationSize - a.populationSize);
}

/**
 * Calculates stratum population breakdown and projected sample allocation for UI preview.
 */
export function getStratifiedBreakdown(
  tableName: string,
  stratifyColumn: string,
  allocation: 'proportional' | 'equal',
  targetTotalOrCount: number,
  isPercentage = false
): StratumAllocationInfo[] {
  const strataSizes = getStrataPopulationSizes(tableName, stratifyColumn);
  return computeStratumBreakdownFromPop(strataSizes, allocation, targetTotalOrCount, isPercentage);
}

