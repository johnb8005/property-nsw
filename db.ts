import { Database } from "bun:sqlite";

const db = new Database("propert.db");

// Initialize database schema
export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      address TEXT,
      suburb TEXT,
      postcode TEXT,
      price INTEGER,
      land_area REAL,
      contract_date TEXT,
      settlement_date TEXT,
      zone_code TEXT,
      property_type TEXT,
      property_desc TEXT,
      price_per_sqm INTEGER,
      latitude REAL,
      longitude REAL,
      source_file TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sales_suburb ON sales(suburb)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sales_postcode ON sales(postcode)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sales_settlement_date ON sales(settlement_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sales_price ON sales(price)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS suburb_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suburb TEXT,
      postcode TEXT,
      sales_count INTEGER,
      total_value INTEGER,
      median_price INTEGER,
      avg_price INTEGER,
      min_price INTEGER,
      max_price INTEGER,
      avg_price_per_sqm INTEGER,
      sales_count_prev_year INTEGER,
      median_price_prev_year INTEGER,
      growth_1yr REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(suburb, postcode)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_suburb_stats_suburb ON suburb_stats(suburb)`);

  // Add momentum_score column if it doesn't exist
  try {
    db.run(`ALTER TABLE suburb_stats ADD COLUMN momentum_score INTEGER`);
  } catch (e) {
    // Column already exists
  }
}

// Insert sales in batches
export function insertSales(sales: any[]) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO sales
    (id, property_id, address, suburb, postcode, price, land_area,
     contract_date, settlement_date, zone_code, property_type, property_desc,
     price_per_sqm, source_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((sales: any[]) => {
    for (const s of sales) {
      insert.run(
        s.id,
        s.propertyId || null,
        s.address,
        s.suburb,
        s.postcode,
        s.price,
        s.landArea,
        s.contractDate,
        s.settlementDate,
        s.zoneCode,
        s.propertyType,
        s.propertyDesc,
        s.pricePerSqm,
        s.sourceFile
      );
    }
  });

  insertMany(sales);
}

// Calculate and store suburb statistics
export function calculateSuburbStats() {
  db.run(`DELETE FROM suburb_stats`);

  // Get all suburb/postcode combinations with 5+ sales
  const suburbs = db.query(`
    SELECT suburb, postcode, COUNT(*) as cnt
    FROM sales
    WHERE settlement_date >= '20250101'
    GROUP BY suburb, postcode
    HAVING cnt >= 5
  `).all() as { suburb: string; postcode: string; cnt: number }[];

  const insert = db.prepare(`
    INSERT INTO suburb_stats
    (suburb, postcode, sales_count, total_value, median_price, avg_price,
     min_price, max_price, avg_price_per_sqm, sales_count_prev_year,
     median_price_prev_year, growth_1yr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const { suburb, postcode } of suburbs) {
      // Get current year prices
      const prices = db.query(`
        SELECT price FROM sales
        WHERE suburb = ? AND postcode = ? AND settlement_date >= '20250101'
        ORDER BY price
      `).all(suburb, postcode) as { price: number }[];

      if (prices.length === 0) continue;

      const priceValues = prices.map(p => p.price);
      const median = priceValues[Math.floor(priceValues.length / 2)];
      const total = priceValues.reduce((a, b) => a + b, 0);
      const avg = Math.round(total / priceValues.length);

      // Get avg price per sqm
      const sqmResult = db.query(`
        SELECT AVG(price / land_area) as avg_sqm
        FROM sales
        WHERE suburb = ? AND postcode = ? AND settlement_date >= '20250101' AND land_area > 0
      `).get(suburb, postcode) as { avg_sqm: number | null };

      // Previous year stats (2024)
      const prevPrices = db.query(`
        SELECT price FROM sales
        WHERE suburb = ? AND postcode = ? AND settlement_date >= '20240101' AND settlement_date < '20250101'
        ORDER BY price
      `).all(suburb, postcode) as { price: number }[];

      const prevMedian = prevPrices.length > 0
        ? prevPrices[Math.floor(prevPrices.length / 2)].price
        : null;

      const growth = prevMedian && prevMedian > 0
        ? Math.round((median - prevMedian) * 1000 / prevMedian) / 10
        : 0;

      insert.run(
        suburb,
        postcode,
        priceValues.length,
        total,
        median,
        avg,
        Math.min(...priceValues),
        Math.max(...priceValues),
        sqmResult.avg_sqm ? Math.round(sqmResult.avg_sqm) : null,
        prevPrices.length,
        prevMedian,
        growth
      );
    }
  });

  insertAll();
  console.log(`Calculated stats for ${suburbs.length} suburbs`);

  // Calculate momentum scores (0-100) based on percentiles
  // Formula: growth_percentile × 0.5 + volume_percentile × 0.3 + inverse_price_percentile × 0.2
  const allStats = db.query(`
    SELECT id, growth_1yr, sales_count, median_price
    FROM suburb_stats
    WHERE sales_count >= 10
  `).all() as { id: number; growth_1yr: number; sales_count: number; median_price: number }[];

  if (allStats.length > 0) {
    // Sort and calculate percentiles
    const growthSorted = [...allStats].sort((a, b) => a.growth_1yr - b.growth_1yr);
    const volumeSorted = [...allStats].sort((a, b) => a.sales_count - b.sales_count);
    const priceSorted = [...allStats].sort((a, b) => b.median_price - a.median_price); // inverse

    const getPercentile = (arr: typeof allStats, item: typeof allStats[0]) => {
      const idx = arr.findIndex(x => x.id === item.id);
      return Math.round((idx / (arr.length - 1)) * 100);
    };

    const updateMomentum = db.prepare(`UPDATE suburb_stats SET momentum_score = ? WHERE id = ?`);
    const updateAll = db.transaction(() => {
      for (const stat of allStats) {
        const growthPct = getPercentile(growthSorted, stat);
        const volumePct = getPercentile(volumeSorted, stat);
        const pricePct = getPercentile(priceSorted, stat); // lower price = higher percentile

        const momentum = Math.round(
          growthPct * 0.5 +
          volumePct * 0.3 +
          pricePct * 0.2
        );

        updateMomentum.run(momentum, stat.id);
      }
    });
    updateAll();
    console.log(`Calculated momentum scores for ${allStats.length} suburbs`);
  }
}

// Get all sales
export function getAllSales() {
  return db.query(`
    SELECT * FROM sales
    WHERE settlement_date >= '20250101'
    ORDER BY settlement_date DESC
  `).all();
}

// Get suburb rankings
export function getSuburbRankings(sortBy = 'median_price', order = 'DESC', limit = 100) {
  const validColumns = ['median_price', 'sales_count', 'growth_1yr', 'avg_price_per_sqm', 'total_value', 'momentum_score'];
  const col = validColumns.includes(sortBy) ? sortBy : 'median_price';
  const dir = order === 'ASC' ? 'ASC' : 'DESC';

  return db.query(`
    SELECT * FROM suburb_stats
    ORDER BY ${col} ${dir}
    LIMIT ?
  `).all(limit);
}

// Get suburb detail
export function getSuburbDetail(suburb: string, postcode: string) {
  const stats = db.query(`
    SELECT * FROM suburb_stats
    WHERE UPPER(suburb) = UPPER(?) AND postcode = ?
  `).get(suburb, postcode);

  const recentSales = db.query(`
    SELECT * FROM sales
    WHERE UPPER(suburb) = UPPER(?) AND postcode = ?
    ORDER BY settlement_date DESC
    LIMIT 50
  `).all(suburb, postcode);

  // Get monthly price trend
  const priceTrend = db.query(`
    SELECT
      SUBSTR(settlement_date, 1, 6) as month,
      COUNT(*) as sales_count,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM sales
    WHERE UPPER(suburb) = UPPER(?) AND postcode = ?
    GROUP BY SUBSTR(settlement_date, 1, 6)
    ORDER BY month
  `).all(suburb, postcode);

  return { stats, recentSales, priceTrend };
}

// Get sales count
export function getSalesCount() {
  const result = db.query(`SELECT COUNT(*) as count FROM sales`).get() as { count: number };
  return result.count;
}

// Search suburbs
export function searchSuburbs(query: string) {
  return db.query(`
    SELECT DISTINCT suburb, postcode, sales_count, median_price
    FROM suburb_stats
    WHERE suburb LIKE ? OR postcode LIKE ?
    ORDER BY sales_count DESC
    LIMIT 20
  `).all(`%${query}%`, `%${query}%`);
}

// Get outliers - sales significantly above/below expected price per sqm
export function getOutliers(threshold = 2.0, limit = 100) {
  // Get all sales with valid price_per_sqm grouped by postcode prefix (first 3 digits)
  const sales = db.query(`
    SELECT
      id, address, suburb, postcode, price, land_area, price_per_sqm,
      settlement_date, zone_code,
      SUBSTR(postcode, 1, 3) as postcode_prefix
    FROM sales
    WHERE price_per_sqm IS NOT NULL
      AND price_per_sqm > 0
      AND land_area > 0
      AND settlement_date >= '20250101'
  `).all() as {
    id: string;
    address: string;
    suburb: string;
    postcode: string;
    price: number;
    land_area: number;
    price_per_sqm: number;
    settlement_date: string;
    zone_code: string;
    postcode_prefix: string;
  }[];

  // Group by postcode prefix and calculate mean/std
  const prefixStats: Record<string, { mean: number; std: number; count: number }> = {};
  const prefixValues: Record<string, number[]> = {};

  for (const sale of sales) {
    if (!prefixValues[sale.postcode_prefix]) {
      prefixValues[sale.postcode_prefix] = [];
    }
    prefixValues[sale.postcode_prefix].push(sale.price_per_sqm);
  }

  for (const [prefix, values] of Object.entries(prefixValues)) {
    if (values.length < 5) continue; // Need minimum samples
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    prefixStats[prefix] = { mean, std, count: values.length };
  }

  // Calculate z-score for each sale and identify outliers
  const outliers: {
    id: string;
    address: string;
    suburb: string;
    postcode: string;
    price: number;
    land_area: number;
    price_per_sqm: number;
    settlement_date: string;
    zone_code: string;
    expected_price_per_sqm: number;
    z_score: number;
    outlier_type: 'underpriced' | 'overpriced';
    deviation_pct: number;
  }[] = [];

  for (const sale of sales) {
    const stats = prefixStats[sale.postcode_prefix];
    if (!stats || stats.std === 0) continue;

    const zScore = (sale.price_per_sqm - stats.mean) / stats.std;
    if (Math.abs(zScore) > threshold) {
      const deviationPct = Math.round(((sale.price_per_sqm - stats.mean) / stats.mean) * 100);
      outliers.push({
        ...sale,
        expected_price_per_sqm: Math.round(stats.mean),
        z_score: Math.round(zScore * 100) / 100,
        outlier_type: zScore < 0 ? 'underpriced' : 'overpriced',
        deviation_pct: deviationPct,
      });
    }
  }

  // Sort by absolute z-score descending
  outliers.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));

  return {
    outliers: outliers.slice(0, limit),
    totalOutliers: outliers.length,
    underpricedCount: outliers.filter(o => o.outlier_type === 'underpriced').length,
    overpricedCount: outliers.filter(o => o.outlier_type === 'overpriced').length,
    prefixStats,
  };
}

// Get price prediction stats by month and postcode prefix
export function getPredictionStats() {
  const monthlyStats = db.query(`
    SELECT
      SUBSTR(postcode, 1, 3) as postcode_prefix,
      SUBSTR(settlement_date, 1, 6) as month,
      COUNT(*) as sales_count,
      AVG(price_per_sqm) as avg_price_per_sqm,
      MIN(price_per_sqm) as min_price_per_sqm,
      MAX(price_per_sqm) as max_price_per_sqm
    FROM sales
    WHERE price_per_sqm IS NOT NULL
      AND price_per_sqm > 0
      AND settlement_date >= '20240101'
    GROUP BY SUBSTR(postcode, 1, 3), SUBSTR(settlement_date, 1, 6)
    HAVING sales_count >= 3
    ORDER BY postcode_prefix, month
  `).all();

  return monthlyStats;
}

export default db;
