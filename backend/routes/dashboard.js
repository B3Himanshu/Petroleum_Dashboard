import express from 'express';
import { query } from '../config/database.js';
import {
  getMetricsFromSage,
  getMetricsFromSageAllSites,
  getSalesDistributionFromSage,
  getDateWiseFromSage,
  getMonthlyPerformanceFromSage,
  getTotalSalesFromSage,
} from '../utils/sageDashboard.js';

const router = express.Router();

// Same transactions table as petrol-data (Latest Petrol) so Index shows same data source
const TRANSACTIONS_SCHEMA = process.env.DB_TRANSACTIONS_SCHEMA || process.env.PETROL_DATA_SCHEMA || null;
const TRANSACTIONS_TABLE = (TRANSACTIONS_SCHEMA && /^[a-zA-Z0-9_]+$/.test(TRANSACTIONS_SCHEMA))
  ? `"${TRANSACTIONS_SCHEMA}".transactions`
  : 'transactions';

/**
 * Helper function to convert date range to year/month arrays for fuel_margin_data queries
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} Object with years and months arrays
 */
function getYearMonthRangeFromDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = new Set();
  const months = new Set();
  
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // JavaScript months are 0-indexed
    years.add(year);
    months.add(month);
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return {
    years: Array.from(years).sort((a, b) => a - b),
    months: Array.from(months).sort((a, b) => a - b)
  };
}

// Dept number (site_code) → display name for site-rankings (aligned with testScript.js / petrolDataSage)
const DEPT_TO_SITE_NAME = {
  6: 'Manor Service Station', 7: 'Hen And Chicken SS', 9: 'Salterton Road SS', 10: 'Lanner Moor Garage',
  11: 'Luton Road SS', 14: 'Kings Lane SS', 17: 'Delph SS', 18: 'Saxon Autopoint SS', 19: 'Jubits Lane SS',
  20: 'Worsley Brow', 23: 'Auto Pitstop', 24: 'Crown SS', 25: 'Marsland SS', 29: 'Gemini SS', 30: 'Park View',
  31: 'Filleybrook SS', 33: 'Swan Connect', 34: 'Portland', 35: 'Lower Lane', 36: 'Vale SS', 37: 'Kensington SS',
  38: 'County Oak SS', 39: 'Kings Of Sedgley', 40: 'Gnosall SS', 41: 'Minsterley SS', 42: 'Nelson SS',
  43: 'Yeovil SS', 44: 'Canklow SS', 45: 'Stanton Self Service',
};

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics for a specific site
 * Query params: siteId (site_code), month (or months as comma-separated), year (or years as comma-separated)
 */
router.get('/metrics', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/metrics');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { siteId, month, months, year, years } = req.query;
    
    if (!siteId) {
      console.error('❌ [Backend] Missing siteId parameter');
      return res.status(400).json({
        success: false,
        message: 'siteId is required'
      });
    }
    
    // Parse months - support both single month and comma-separated months
    let monthsArray = [];
    if (months) {
      monthsArray = months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      console.log('📊 [Backend] Parsed months array from "months" param:', monthsArray);
    } else if (month) {
      monthsArray = [parseInt(month, 10)];
      console.log('📊 [Backend] Parsed single month from "month" param:', monthsArray);
    } else {
      monthsArray = [new Date().getMonth() + 1];
      console.log('📊 [Backend] Using default month (current):', monthsArray);
    }
    
    // Parse years - support both single year and comma-separated years
    let yearsArray = [];
    if (years) {
      yearsArray = years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      console.log('📊 [Backend] Parsed years array from "years" param:', yearsArray);
    } else if (year) {
      yearsArray = [parseInt(year, 10)];
      console.log('📊 [Backend] Parsed single year from "year" param:', yearsArray);
    } else {
      yearsArray = [new Date().getFullYear()];
      console.log('📊 [Backend] Using default year (current):', yearsArray);
    }
    
    if (monthsArray.length === 0 || yearsArray.length === 0) {
      console.error('❌ [Backend] Invalid month or year parameters', { monthsArray, yearsArray });
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year parameters'
      });
    }
    
    // All sites: aggregate over all sites (no dept_number filter)
    if (String(siteId).toLowerCase() === 'all') {
      try {
        const data = await getMetricsFromSageAllSites(monthsArray, yearsArray, TRANSACTIONS_TABLE);
        return res.json({ success: true, data });
      } catch (sageErr) {
        console.warn('⚠️ [Backend] Sage all-sites metrics failed:', sageErr.message);
        return res.status(500).json({ success: false, message: 'Failed to load all-sites metrics' });
      }
    }
    
    const siteCode = parseInt(siteId, 10);
    console.log('📊 [Backend] Parsed siteCode:', siteCode);
    
    // Prefer Sage (transactions) so dashboard shows same data as Latest Petrol (Formula Sheet + PRL Logic Bar)
    try {
      const data = await getMetricsFromSage(siteCode, monthsArray, yearsArray, TRANSACTIONS_TABLE);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.warn('⚠️ [Backend] Sage metrics failed, using legacy tables:', sageErr.message);
    }
    
    console.log('📊 [Backend] Final parameters (legacy path):', {
      siteCode,
      monthsArray,
      yearsArray,
      totalCombinations: monthsArray.length * yearsArray.length
    });
    
    // Build parameterized query for multiple months and years
    // Create placeholders dynamically but safely using parameterized queries
    const allParams = [siteCode, ...monthsArray, ...yearsArray];
    const monthPlaceholders = monthsArray.map((_, i) => `$${i + 2}`).join(',');
    const yearStartIndex = monthsArray.length + 2;
    const yearPlaceholders = yearsArray.map((_, i) => `$${yearStartIndex + i}`).join(',');
    
    // Get monthly summary data aggregated across all selected months/years
    const monthlyQuery = `
      SELECT 
        SUM(bunkered_volume) as bunkered_volume,
        SUM(bunkered_sales) as bunkered_sales,
        SUM(bunkered_purchases) as bunkered_purchases,
        SUM(non_bunkered_volume) as non_bunkered_volume,
        SUM(non_bunkered_sales) as non_bunkered_sales,
        SUM(non_bunkered_purchases) as non_bunkered_purchases,
        SUM(shop_sales) as shop_sales,
        SUM(shop_purchases) as shop_purchases,
        SUM(valet_sales) as valet_sales,
        SUM(valet_purchases) as valet_purchases,
        SUM(overheads) as overheads,
        SUM(labour_cost) as labour_cost
      FROM monthly_summary
      WHERE site_code = $1
        AND month IN (${monthPlaceholders})
        AND year IN (${yearPlaceholders});
    `;
    console.log('📊 [Backend] Executing monthly_summary query:', {
      query: monthlyQuery,
      params: allParams
    });
    const monthlyResult = await query(monthlyQuery, allParams);
    console.log('📊 [Backend] monthly_summary query result:', {
      rowCount: monthlyResult.rows.length,
      data: monthlyResult.rows[0]
    });
    
    // Get fuel margin data aggregated for PPL calculation
    const fuelMarginQuery = `
      SELECT 
        AVG(ppl) as avg_ppl,
        SUM(fuel_profit) as fuel_profit,
        SUM(net_sales) as net_sales,
        SUM(sale_volume) as sale_volume
      FROM fuel_margin_data
      WHERE site_code = $1
        AND month IN (${monthPlaceholders})
        AND year IN (${yearPlaceholders});
    `;
    console.log('📊 [Backend] Executing fuel_margin_data query:', {
      query: fuelMarginQuery,
      params: allParams
    });
    const fuelMarginResult = await query(fuelMarginQuery, allParams);
    console.log('📊 [Backend] fuel_margin_data query result:', {
      rowCount: fuelMarginResult.rows.length,
      data: fuelMarginResult.rows[0]
    });
    
    // Calculate totals from monthly summary
    const monthly = monthlyResult.rows[0] || {};
    const fuelMargin = fuelMarginResult.rows[0] || {};
    
    console.log('📊 [Backend] Raw data from queries:', {
      monthly: {
        bunkered_volume: monthly.bunkered_volume,
        bunkered_sales: monthly.bunkered_sales,
        non_bunkered_volume: monthly.non_bunkered_volume,
        non_bunkered_sales: monthly.non_bunkered_sales,
        shop_sales: monthly.shop_sales,
        valet_sales: monthly.valet_sales
      },
      fuelMargin: {
        avg_ppl: fuelMargin.avg_ppl,
        fuel_profit: fuelMargin.fuel_profit,
        net_sales: fuelMargin.net_sales
      }
    });
    
    // Calculate total fuel volume - use sale_volume from fuel_margin_data to match Excel data
    // Fallback to monthly_summary if fuel_margin_data doesn't have sale_volume
    const totalFuelVolume = parseFloat(fuelMargin.sale_volume || 0) || 
                           (parseFloat(monthly.bunkered_volume || 0) + 
                            parseFloat(monthly.non_bunkered_volume || 0));
    
    // Calculate net sales (sum across all months) - use net_sales from fuel_margin_data to match Excel
    const totalFuelSales = parseFloat(monthly.bunkered_sales || 0) + 
                          parseFloat(monthly.non_bunkered_sales || 0);
    const netSales = parseFloat(fuelMargin.net_sales || totalFuelSales);
    
    // Calculate profit (sum across all months)
    const fuelProfit = parseFloat(fuelMargin.fuel_profit || 0);
    const shopProfit = parseFloat(monthly.shop_sales || 0) - parseFloat(monthly.shop_purchases || 0);
    const valetProfit = parseFloat(monthly.valet_sales || 0) - parseFloat(monthly.valet_purchases || 0);
    const totalProfit = fuelProfit + shopProfit + valetProfit;
    
    // Get average PPL across all months (weighted average would be better, but simple avg for now)
    const avgPPL = parseFloat(fuelMargin.avg_ppl || 0);
    const actualPPL = avgPPL;
    
    // Calculate labour cost as percentage of total shop sales
    const shopSales = parseFloat(monthly.shop_sales || 0);
    const labourCost = parseFloat(monthly.labour_cost || 0);
    const labourCostPercent = shopSales > 0 ? (labourCost / shopSales) * 100 : 0;
    
    console.log('📊 [Backend] Calculated intermediate values:', {
      totalFuelVolume,
      totalFuelSales,
      netSales,
      fuelProfit,
      shopProfit,
      valetProfit,
      totalProfit,
      avgPPL,
      shopSales,
      labourCost,
      labourCostPercent
    });
    
    // Basket size - aggregate transactions across all months/years
    const transactionQuery = `
      SELECT COUNT(*) as count
      FROM transactions
      WHERE site_code = $1
        AND EXTRACT(MONTH FROM transaction_date) IN (${monthPlaceholders})
        AND EXTRACT(YEAR FROM transaction_date) IN (${yearPlaceholders})
        AND deleted_flag = 0
        AND category IN ('shop_sales', 'fuel_sales');
    `;
    console.log('📊 [Backend] Executing transactions query:', {
      query: transactionQuery,
      params: allParams
    });
    const transactionCount = await query(transactionQuery, allParams);
    console.log('📊 [Backend] transactions query result:', {
      rowCount: transactionCount.rows.length,
      count: transactionCount.rows[0]?.count
    });
    
    const transactionCountValue = parseInt(transactionCount.rows[0]?.count || 0);
    const basketSize = transactionCountValue > 0 ? (shopSales / transactionCountValue) : 0;
    
    // Calculate detailed breakdowns for modals
    const bunkeredVolume = parseFloat(monthly.bunkered_volume || 0);
    const nonBunkeredVolume = parseFloat(monthly.non_bunkered_volume || 0);
    const bunkeredSales = parseFloat(monthly.bunkered_sales || 0);
    const nonBunkeredSales = parseFloat(monthly.non_bunkered_sales || 0);
    const bunkeredPurchases = parseFloat(monthly.bunkered_purchases || 0);
    const nonBunkeredPurchases = parseFloat(monthly.non_bunkered_purchases || 0);
    // shopSales and labourCost already declared above
    const shopPurchases = parseFloat(monthly.shop_purchases || 0);
    const valetSales = parseFloat(monthly.valet_sales || 0);
    const valetPurchases = parseFloat(monthly.valet_purchases || 0);
    const overheads = parseFloat(monthly.overheads || 0);
    
    const responseData = {
      totalFuelVolume: totalFuelVolume, // Liters (sum)
      fuelSales: totalFuelSales, // Fuel sales £ (4000-4008) for parity with Sage path
      netSales: netSales, // Pounds (sum)
      profit: Math.abs(totalProfit), // Pounds (sum, displayed as positive)
      avgPPL: avgPPL, // Pence per liter (average)
      actualPPL: actualPPL, // Pence per liter (average)
      labourCostPercent: parseFloat(labourCostPercent.toFixed(2)),
      basketSize: parseFloat(basketSize.toFixed(2)),
      customerCount: transactionCountValue, // Total count
      // Detailed breakdowns for modals
      bunkeredVolume: bunkeredVolume,
      nonBunkeredVolume: nonBunkeredVolume,
      bunkeredSales: bunkeredSales,
      nonBunkeredSales: nonBunkeredSales,
      bunkeredPurchases: bunkeredPurchases,
      nonBunkeredPurchases: nonBunkeredPurchases,
      shopSales: shopSales,
      shopPurchases: shopPurchases,
      valetSales: valetSales,
      valetPurchases: valetPurchases,
      overheads: overheads,
      labourCost: labourCost,
      fuelProfit: fuelProfit,
      shopProfit: shopProfit,
      valetProfit: valetProfit
    };
    
    console.log('📊 [Backend] Final calculated metrics:', responseData);
    console.log('📊 [Backend] Response summary:', {
      success: true,
      dataKeys: Object.keys(responseData),
      totalFuelVolume: responseData.totalFuelVolume,
      netSales: responseData.netSales,
      profit: responseData.profit,
      avgPPL: responseData.avgPPL,
      customerCount: responseData.customerCount,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Dashboard metrics from legacy tables failed, using Sage transactions:', error.message);
    try {
      const siteCode = parseInt(req.query.siteId, 10);
      let monthsArray = [];
      if (req.query.months) monthsArray = req.query.months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      else if (req.query.month) monthsArray = [parseInt(req.query.month, 10)];
      else monthsArray = [new Date().getMonth() + 1];
      let yearsArray = [];
      if (req.query.years) yearsArray = req.query.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      else if (req.query.year) yearsArray = [parseInt(req.query.year, 10)];
      else yearsArray = [new Date().getFullYear()];
      if (monthsArray.length === 0) monthsArray = [new Date().getMonth() + 1];
      if (yearsArray.length === 0) yearsArray = [new Date().getFullYear()];
      const data = await getMetricsFromSage(siteCode, monthsArray, yearsArray);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.error('❌ [Backend] Sage metrics fallback failed:', sageErr.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching dashboard metrics',
        error: sageErr.message
      });
    }
  }
});

/**
 * GET /api/dashboard/charts/monthly-performance
 * Get monthly performance chart data for year(s)
 * Query params: siteId (site_code), year (or years as comma-separated)
 */
router.get('/charts/monthly-performance', async (req, res) => {
  try {
    console.log('📈 [Backend] GET /api/dashboard/charts/monthly-performance');
    console.log('📈 [Backend] Query params:', req.query);
    
    const { siteId, year, years } = req.query;
    
    if (!siteId) {
      console.error('❌ [Backend] Missing siteId parameter');
      return res.status(400).json({
        success: false,
        message: 'siteId is required'
      });
    }
    
    const siteCode = parseInt(siteId, 10);
    console.log('📈 [Backend] Parsed siteCode:', siteCode);
    
    // Parse years - support both single year and comma-separated years
    let yearsArray = [];
    if (years) {
      yearsArray = years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      console.log('📈 [Backend] Parsed years array from "years" param:', yearsArray);
    } else if (year) {
      yearsArray = [parseInt(year, 10)];
      console.log('📈 [Backend] Parsed single year from "year" param:', yearsArray);
    } else {
      yearsArray = [new Date().getFullYear()];
      console.log('📈 [Backend] Using default year (current):', yearsArray);
    }
    
    if (yearsArray.length === 0) {
      console.error('❌ [Backend] Invalid year parameter');
      return res.status(400).json({
        success: false,
        message: 'Invalid year parameter'
      });
    }
    
    // Build parameterized query
    const yearPlaceholders = yearsArray.map((_, i) => `$${i + 2}`).join(',');
    const allParams = [siteCode, ...yearsArray];
    
    console.log('📈 [Backend] Final parameters:', {
      siteCode,
      yearsArray,
      yearPlaceholders
    });
    
    // Get monthly summary data aggregated across all selected years
    // Group by month and sum across all years
    // Also check fuel_margin_data for months that might not be in monthly_summary
    // Use monthly_summary as primary source, fallback to fuel_margin_data for missing months
    // This ensures we get ALL months from the database (May-Nov from fuel_margin_data, Oct-Nov from monthly_summary)
    const monthlyPerfQuery = `
      WITH monthly_data AS (
        SELECT 
          month,
          SUM(bunkered_sales + non_bunkered_sales) as total_fuel_sales,
          SUM((bunkered_sales + non_bunkered_sales) - (bunkered_purchases + non_bunkered_purchases)) as fuel_profit,
          SUM(shop_sales) as shop_sales,
          SUM(valet_sales) as valet_sales
        FROM monthly_summary
        WHERE site_code = $1
          AND year IN (${yearPlaceholders})
        GROUP BY month
      ),
      fuel_margin_data_agg AS (
        SELECT 
          month,
          SUM(net_sales) as net_sales,
          SUM(fuel_profit) as fuel_profit,
          SUM(sale_volume) as sale_volume,
          AVG(ppl) as avg_ppl
        FROM fuel_margin_data
        WHERE site_code = $1
          AND year IN (${yearPlaceholders})
        GROUP BY month
      ),
      all_months AS (
        SELECT DISTINCT month FROM monthly_data
        UNION
        SELECT DISTINCT month FROM fuel_margin_data_agg
      )
      SELECT 
        am.month,
        -- Prioritize fuel_margin_data.net_sales to match Excel data
        -- Fallback to monthly_summary if fuel_margin_data is not available
        CASE 
          WHEN fmd.net_sales IS NOT NULL AND fmd.net_sales > 0 
          THEN fmd.net_sales 
          ELSE COALESCE(md.total_fuel_sales, 0) 
        END as total_fuel_sales,
        CASE 
          WHEN fmd.fuel_profit IS NOT NULL 
          THEN fmd.fuel_profit 
          ELSE COALESCE(md.fuel_profit, 0) 
        END as fuel_profit,
        COALESCE(fmd.sale_volume, 0) as sale_volume,
        COALESCE(fmd.avg_ppl, 0) as avg_ppl,
        COALESCE(md.shop_sales, 0) as shop_sales,
        COALESCE(md.valet_sales, 0) as valet_sales
      FROM all_months am
      LEFT JOIN monthly_data md ON am.month = md.month
      LEFT JOIN fuel_margin_data_agg fmd ON am.month = fmd.month
      ORDER BY am.month;
    `;
    console.log('📈 [Backend] Executing monthly performance query from DATABASE:', {
      siteCode,
      yearsArray,
      query: monthlyPerfQuery,
      params: allParams,
      note: 'Querying monthly_summary and fuel_margin_data tables to get ALL months with data'
    });
    // Initialize data for all 12 months - ensure ALL months are included even if no data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const result = await query(monthlyPerfQuery, allParams);
    console.log('📈 [Backend] Monthly performance query result from DATABASE:', {
      rowCount: result.rows.length,
      months: result.rows.map(r => ({ 
        month: r.month, 
        monthName: monthNames[r.month - 1],
        sales: r.total_fuel_sales,
        profit: r.fuel_profit,
        shopSales: r.shop_sales,
        valetSales: r.valet_sales
      })),
      monthsList: result.rows.map(r => `${monthNames[r.month - 1]} (${r.month})`).join(', '),
      dataSource: 'DATABASE - Combined from monthly_summary and fuel_margin_data tables'
    });
    
    if (result.rows.length === 0) {
      console.warn('⚠️ [Backend] No data found in database for site', siteCode, 'year(s)', yearsArray);
    }
    const salesData = new Array(12).fill(0);
    const profitData = new Array(12).fill(0);
    const saleVolumeData = new Array(12).fill(0);
    const pplData = new Array(12).fill(0);
    const shopSalesData = new Array(12).fill(0);
    const valetSalesData = new Array(12).fill(0);
    
    console.log('📈 [Backend] Initializing arrays for all 12 months:', {
      monthNames,
      initialSalesData: salesData,
      rowsFromDB: result.rows.length,
      monthsWithData: result.rows.map(r => r.month)
    });
    
    // Fill in actual data (aggregated across all years)
    result.rows.forEach(row => {
      const monthIndex = row.month - 1; // month is 1-12, array is 0-11
      if (monthIndex >= 0 && monthIndex < 12) {
        salesData[monthIndex] = parseFloat(row.total_fuel_sales || 0);
        profitData[monthIndex] = parseFloat(row.fuel_profit || 0);
        saleVolumeData[monthIndex] = parseFloat(row.sale_volume || 0);
        pplData[monthIndex] = parseFloat(row.avg_ppl || 0);
        shopSalesData[monthIndex] = parseFloat(row.shop_sales || 0);
        valetSalesData[monthIndex] = parseFloat(row.valet_sales || 0);
      }
    });
    
    console.log('📈 [Backend] After filling data from database:', {
      salesData,
      shopSalesData,
      valetSalesData,
      monthsWithSales: salesData.map((val, idx) => ({ month: monthNames[idx], value: val })).filter(m => m.value > 0),
      allMonthsIncluded: salesData.length === 12
    });
    
    const responseData = {
      labels: monthNames,
      datasets: [
        {
          name: 'Sales',
          data: salesData
        },
        {
          name: 'Profit',
          data: profitData
        },
        {
          name: 'Sale Volume',
          data: saleVolumeData
        },
        {
          name: 'PPL',
          data: pplData
        },
        {
          name: 'Shop Sales',
          data: shopSalesData
        },
        {
          name: 'Valet Sales',
          data: valetSalesData
        }
      ]
    };
    
    console.log('📈 [Backend] Monthly performance response data:', {
      labelsCount: responseData.labels.length,
      labels: responseData.labels,
      salesDataPoints: salesData.filter(v => v > 0).length,
      profitDataPoints: profitData.filter(v => v > 0).length,
      shopSalesDataPoints: shopSalesData.filter(v => v > 0).length,
      valetSalesDataPoints: valetSalesData.filter(v => v > 0).length,
      totalSales: salesData.reduce((a, b) => a + b, 0),
      totalProfit: profitData.reduce((a, b) => a + b, 0),
      allMonthsIncluded: responseData.labels.length === 12,
      datasetsCount: responseData.datasets.length
    });
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Monthly performance from legacy tables failed, using Sage transactions:', error.message);
    try {
      const siteCode = parseInt(req.query.siteId, 10);
      let yearsArray = [];
      if (req.query.years) yearsArray = req.query.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      else if (req.query.year) yearsArray = [parseInt(req.query.year, 10)];
      else yearsArray = [new Date().getFullYear()];
      if (yearsArray.length === 0) yearsArray = [new Date().getFullYear()];
      const data = await getMonthlyPerformanceFromSage(siteCode, yearsArray);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.error('❌ [Backend] Sage monthly performance fallback failed:', sageErr.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching monthly performance',
        error: sageErr.message
      });
    }
  }
});

/**
 * GET /api/dashboard/charts/sales-distribution
 * Get sales distribution chart data
 * Query params: siteId (site_code), month (or months), year (or years)
 */
router.get('/charts/sales-distribution', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/charts/sales-distribution');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { siteId, month, months, year, years } = req.query;
    
    if (!siteId) {
      console.error('❌ [Backend] Missing siteId parameter');
      return res.status(400).json({
        success: false,
        message: 'siteId is required'
      });
    }
    
    const siteCode = parseInt(siteId, 10);
    console.log('📊 [Backend] Parsed siteCode:', siteCode);
    
    // Parse months
    let monthsArray = [];
    if (months) {
      monthsArray = months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      console.log('📊 [Backend] Parsed months array from "months" param:', monthsArray);
    } else if (month) {
      monthsArray = [parseInt(month, 10)];
      console.log('📊 [Backend] Parsed single month from "month" param:', monthsArray);
    } else {
      monthsArray = [new Date().getMonth() + 1];
      console.log('📊 [Backend] Using default month (current):', monthsArray);
    }
    
    // Parse years
    let yearsArray = [];
    if (years) {
      yearsArray = years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      console.log('📊 [Backend] Parsed years array from "years" param:', yearsArray);
    } else if (year) {
      yearsArray = [parseInt(year, 10)];
      console.log('📊 [Backend] Parsed single year from "year" param:', yearsArray);
    } else {
      yearsArray = [new Date().getFullYear()];
      console.log('📊 [Backend] Using default year (current):', yearsArray);
    }
    
    if (monthsArray.length === 0 || yearsArray.length === 0) {
      console.warn('⚠️ [Backend] Empty months or years array, returning zero data');
      return res.json({
        success: true,
        data: [
          { name: 'Fuel Sales', value: 0 },
          { name: 'Shop Sales', value: 0 },
          { name: 'Valet Sales', value: 0 }
        ]
      });
    }
    
    // Prefer Sage (transactions) so dashboard shows same data as Latest Petrol (Formula Sheet + PRL Logic Bar)
    try {
      const data = await getSalesDistributionFromSage(siteCode, monthsArray, yearsArray);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.warn('⚠️ [Backend] Sage sales distribution failed, using legacy tables:', sageErr.message);
    }
    
    // Build parameterized query for multiple months and years
    const allParams = [siteCode, ...monthsArray, ...yearsArray];
    const monthPlaceholders = monthsArray.map((_, i) => `$${i + 2}`).join(',');
    const yearStartIndex = monthsArray.length + 2;
    const yearPlaceholders = yearsArray.map((_, i) => `$${yearStartIndex + i}`).join(',');
    
    console.log('📊 [Backend] Final parameters (legacy path):', {
      siteCode,
      monthsArray,
      yearsArray,
      monthPlaceholders,
      yearPlaceholders
    });
    
    // Get sales data from fuel_margin_data (net_sales) to match Excel data
    // Also get shop/valet sales from monthly_summary for breakdown
    const fuelSalesQuery = `
      SELECT 
        SUM(net_sales) as net_sales
      FROM fuel_margin_data
      WHERE site_code = $1
        AND month IN (${monthPlaceholders})
        AND year IN (${yearPlaceholders});
    `;
    
    const shopValetQuery = `
      SELECT 
        SUM(shop_sales) as shop_sales,
        SUM(valet_sales) as valet_sales
      FROM monthly_summary
      WHERE site_code = $1
        AND month IN (${monthPlaceholders})
        AND year IN (${yearPlaceholders});
    `;
    
    console.log('📊 [Backend] Executing sales distribution queries:', {
      fuelSalesQuery,
      shopValetQuery,
      params: allParams
    });
    
    const [fuelResult, shopValetResult] = await Promise.all([
      query(fuelSalesQuery, allParams),
      query(shopValetQuery, allParams)
    ]);
    
    console.log('📊 [Backend] Sales distribution query results:', {
      fuelSales: {
        rowCount: fuelResult.rows.length,
        data: fuelResult.rows[0]
      },
      shopValet: {
        rowCount: shopValetResult.rows.length,
        data: shopValetResult.rows[0]
      }
    });
    
    if ((fuelResult.rows.length === 0 || !fuelResult.rows[0]) && 
        (shopValetResult.rows.length === 0 || !shopValetResult.rows[0])) {
      return res.json({
        success: true,
        data: [
          { name: 'Fuel Sales', value: 0 },
          { name: 'Shop Sales', value: 0 },
          { name: 'Valet Sales', value: 0 }
        ]
      });
    }
    
    // Use net_sales from fuel_margin_data (matches Excel data)
    const fuelRow = fuelResult.rows[0] || {};
    const shopValetRow = shopValetResult.rows[0] || {};
    const fuelSales = parseFloat(fuelRow.net_sales || 0);
    const shopSales = parseFloat(shopValetRow.shop_sales || 0);
    const valetSales = parseFloat(shopValetRow.valet_sales || 0);
    
    const responseData = [
      { name: 'Fuel Sales', value: fuelSales },
      { name: 'Shop Sales', value: shopSales },
      { name: 'Valet Sales', value: valetSales }
    ];
    
    console.log('📊 [Backend] Calculated sales distribution:', responseData);
    console.log('📊 [Backend] Total sales:', fuelSales + shopSales + valetSales);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Sales distribution from legacy tables failed, using Sage transactions:', error.message);
    try {
      const siteCode = parseInt(req.query.siteId, 10);
      let monthsArray = [];
      if (req.query.months) monthsArray = req.query.months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      else if (req.query.month) monthsArray = [parseInt(req.query.month, 10)];
      else monthsArray = [new Date().getMonth() + 1];
      let yearsArray = [];
      if (req.query.years) yearsArray = req.query.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      else if (req.query.year) yearsArray = [parseInt(req.query.year, 10)];
      else yearsArray = [new Date().getFullYear()];
      if (monthsArray.length === 0) monthsArray = [new Date().getMonth() + 1];
      if (yearsArray.length === 0) yearsArray = [new Date().getFullYear()];
      const data = await getSalesDistributionFromSage(siteCode, monthsArray, yearsArray);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.error('❌ [Backend] Sage sales distribution fallback failed:', sageErr.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching sales distribution',
        error: sageErr.message
      });
    }
  }
});

/**
 * GET /api/dashboard/status
 * Get status cards data (bank balance, debtors, etc.)
 * Note: These might not be in the current database schema
 * Query params: siteId (site_code)
 */
router.get('/status', async (req, res) => {
  try {
    const { siteId } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required'
      });
    }
    
    const siteCode = parseInt(siteId, 10);
    
    // Note: Bank balance, debtors, creditors, discounts are not in current schema
    // These would typically come from accounting/transaction data
    // For now, return placeholder structure that can be updated when data is available
    
    // Check if we can derive any of this from transactions
    // This is a placeholder - adjust based on your actual accounting data structure
    
    res.json({
      success: true,
      data: {
        bankClosingBalance: 0, // Would need accounting data
        debtorsTotal: 0, // Would need accounts receivable data
        fuelCreditors: 0, // Would need accounts payable data
        fuelCondition: 'Normal', // Would need stock/condition data
        discountsTotal: 0 // Would need discount/transaction data
      },
      note: 'Status data not available in current database schema. These fields would need to be added or calculated from transaction/accounting data.'
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching status',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/charts/date-wise
 * Get daily/date-wise sales data for a specific site and month/year
 * Query params: siteId, month (or months), year (or years)
 */
router.get('/charts/date-wise', async (req, res) => {
  try {
    console.log('📅 [Backend] GET /api/dashboard/charts/date-wise');
    console.log('📅 [Backend] Query params:', req.query);
    
    const { siteId, month, months, year, years } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId is required'
      });
    }
    
    const siteCode = parseInt(siteId, 10);
    
    // Parse months and years
    let monthsArray = [];
    if (months) {
      monthsArray = months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
    } else if (month) {
      monthsArray = [parseInt(month, 10)];
    } else {
      monthsArray = [new Date().getMonth() + 1];
    }
    
    let yearsArray = [];
    if (years) {
      yearsArray = years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
    } else if (year) {
      yearsArray = [parseInt(year, 10)];
    } else {
      yearsArray = [new Date().getFullYear()];
    }
    
    if (monthsArray.length === 0 || yearsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year parameters'
      });
    }
    
    // Get daily sales from transactions table
    // Aggregate by day for the selected months/years
    const monthPlaceholders = monthsArray.map((_, i) => `$${i + 2}`).join(',');
    const yearStartIndex = monthsArray.length + 2;
    const yearPlaceholders = yearsArray.map((_, i) => `$${yearStartIndex + i}`).join(',');
    const allParams = [siteCode, ...monthsArray, ...yearsArray];
    
    const dailySalesQuery = `
      SELECT 
        EXTRACT(DAY FROM transaction_date) as day,
        SUM(CASE WHEN category = 'fuel_sales' THEN amount ELSE 0 END) as fuel_sales,
        SUM(CASE WHEN category = 'shop_sales' THEN amount ELSE 0 END) as shop_sales,
        SUM(CASE WHEN category = 'valet_sales' THEN amount ELSE 0 END) as valet_sales,
        SUM(CASE WHEN category IN ('fuel_sales', 'shop_sales', 'valet_sales') THEN amount ELSE 0 END) as total_sales,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE site_code = $1
        AND EXTRACT(MONTH FROM transaction_date) IN (${monthPlaceholders})
        AND EXTRACT(YEAR FROM transaction_date) IN (${yearPlaceholders})
        AND deleted_flag = 0
        AND category IN ('fuel_sales', 'shop_sales', 'valet_sales')
      GROUP BY EXTRACT(DAY FROM transaction_date)
      ORDER BY day;
    `;
    
    console.log('📅 [Backend] Executing daily sales query:', {
      query: dailySalesQuery,
      params: allParams
    });
    
    const result = await query(dailySalesQuery, allParams);
    console.log('📅 [Backend] Daily sales query result:', {
      rowCount: result.rows.length,
      sampleData: result.rows.slice(0, 5)
    });
    
    // Transform data for chart
    const chartData = result.rows.map(row => ({
      day: parseInt(row.day, 10),
      sales: parseFloat(row.total_sales || 0),
      fuelSales: parseFloat(row.fuel_sales || 0),
      shopSales: parseFloat(row.shop_sales || 0),
      valetSales: parseFloat(row.valet_sales || 0),
      transactionCount: parseInt(row.transaction_count || 0, 10)
    }));
    
    console.log('📅 [Backend] Transformed chart data:', {
      totalDays: chartData.length,
      daysWithData: chartData.filter(d => d.sales > 0).length,
      totalSales: chartData.reduce((sum, d) => sum + d.sales, 0),
      sampleDays: chartData.slice(0, 5)
    });
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Date-wise from legacy transactions failed, using Sage transactions:', error.message);
    try {
      const siteCode = parseInt(req.query.siteId, 10);
      let monthsArray = [];
      if (req.query.months) monthsArray = req.query.months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      else if (req.query.month) monthsArray = [parseInt(req.query.month, 10)];
      else monthsArray = [new Date().getMonth() + 1];
      let yearsArray = [];
      if (req.query.years) yearsArray = req.query.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      else if (req.query.year) yearsArray = [parseInt(req.query.year, 10)];
      else yearsArray = [new Date().getFullYear()];
      if (monthsArray.length === 0) monthsArray = [new Date().getMonth() + 1];
      if (yearsArray.length === 0) yearsArray = [new Date().getFullYear()];
      const data = await getDateWiseFromSage(siteCode, monthsArray, yearsArray);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.error('❌ [Backend] Sage date-wise fallback failed:', sageErr.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching date-wise data',
        error: sageErr.message
      });
    }
  }
});

/**
 * GET /api/dashboard/total-sales
 * Get total sales across all sites
 * Query params: month (or months as comma-separated), year (or years as comma-separated)
 */
router.get('/total-sales', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/total-sales');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { month, months, year, years } = req.query;
    
    // If no month/year provided, get ALL data across all months and years
    const getAllData = !month && !months && !year && !years;
    
    let totalSalesQuery, shopValetQuery, allParams;
    
    if (getAllData) {
      // Get total sales across all sites, all months, all years
      totalSalesQuery = `
        SELECT 
          SUM(net_sales) as total_net_sales
        FROM fuel_margin_data;
      `;
      
      shopValetQuery = `
        SELECT 
          SUM(shop_sales) as total_shop_sales,
          SUM(valet_sales) as total_valet_sales
        FROM monthly_summary;
      `;
      
      allParams = [];
      
      console.log('📊 [Backend] Getting ALL sales data (no month/year filter)');
    } else {
      // Parse months - support both single month and comma-separated months
      let monthsArray = [];
      if (months) {
        monthsArray = months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      } else if (month) {
        monthsArray = [parseInt(month, 10)];
      } else {
        monthsArray = [new Date().getMonth() + 1];
      }
      
      // Parse years - support both single year and comma-separated years
      let yearsArray = [];
      if (years) {
        yearsArray = years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      } else if (year) {
        yearsArray = [parseInt(year, 10)];
      } else {
        yearsArray = [new Date().getFullYear()];
      }
      
      if (monthsArray.length === 0 || yearsArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month or year parameters'
        });
      }
      
      // Build parameterized query for multiple months and years
      const monthPlaceholders = monthsArray.map((_, i) => `$${i + 1}`).join(',');
      const yearStartIndex = monthsArray.length + 1;
      const yearPlaceholders = yearsArray.map((_, i) => `$${yearStartIndex + i}`).join(',');
      allParams = [...monthsArray, ...yearsArray];
      
      // Get total sales across all sites from fuel_margin_data
      totalSalesQuery = `
        SELECT 
          SUM(net_sales) as total_net_sales
        FROM fuel_margin_data
        WHERE month IN (${monthPlaceholders})
          AND year IN (${yearPlaceholders});
      `;
      
      // Also get shop and valet sales from monthly_summary
      shopValetQuery = `
        SELECT 
          SUM(shop_sales) as total_shop_sales,
          SUM(valet_sales) as total_valet_sales
        FROM monthly_summary
        WHERE month IN (${monthPlaceholders})
          AND year IN (${yearPlaceholders});
      `;
    }
    
    console.log('📊 [Backend] Executing total sales queries:', {
      totalSalesQuery,
      shopValetQuery,
      params: allParams,
      getAllData
    });
    
    const [totalSalesResult, shopValetResult] = await Promise.all([
      query(totalSalesQuery, allParams),
      query(shopValetQuery, allParams)
    ]);
    
    const totalNetSales = parseFloat(totalSalesResult.rows[0]?.total_net_sales || 0);
    const totalShopSales = parseFloat(shopValetResult.rows[0]?.total_shop_sales || 0);
    const totalValetSales = parseFloat(shopValetResult.rows[0]?.total_valet_sales || 0);
    
    // Total sales = net sales (fuel) + shop sales + valet sales
    const grandTotal = totalNetSales + totalShopSales + totalValetSales;
    
    console.log('📊 [Backend] Total sales across all sites:', {
      totalNetSales,
      totalShopSales,
      totalValetSales,
      grandTotal,
      getAllData
    });
    
    res.json({
      success: true,
      data: {
        totalSales: grandTotal,
        fuelSales: totalNetSales,
        shopSales: totalShopSales,
        valetSales: totalValetSales
      }
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Total sales from legacy tables failed, using Sage transactions:', error.message);
    try {
      let monthsArray = [];
      if (req.query.months) monthsArray = req.query.months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      else if (req.query.month) monthsArray = [parseInt(req.query.month, 10)];
      let yearsArray = [];
      if (req.query.years) yearsArray = req.query.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      else if (req.query.year) yearsArray = [parseInt(req.query.year, 10)];
      const data = await getTotalSalesFromSage(monthsArray || [], yearsArray || []);
      return res.json({ success: true, data });
    } catch (sageErr) {
      console.error('❌ [Backend] Sage total sales fallback failed:', sageErr.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching total sales',
        error: sageErr.message
      });
    }
  }
});

/**
 * GET /api/dashboard/petrol-data/fuel-volume
 * Get total fuel volume for specific nominal codes filtered by date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/fuel-volume', async (req, res) => {
  try {
    console.log('⛽ [Backend] GET /api/dashboard/petrol-data/fuel-volume');
    console.log('⛽ [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    console.log('⛽ [Backend] Querying fuel_margin_data for sale_volume');
    console.log('⛽ [Backend] Date range:', { startDate, endDate });
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: { totalFuelVolume: 0 }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Query fuel_margin_data table for sale_volume (per documentation)
    const fuelVolumeQuery = `
      SELECT 
        COALESCE(SUM(sale_volume), 0) as total_fuel_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;
    
    const result = await query(fuelVolumeQuery, allParams);
    
    const totalFuelVolume = parseFloat(result.rows[0]?.total_fuel_volume || 0);
    
    console.log('⛽ [Backend] Fuel volume query result:', {
      totalFuelVolume,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        totalFuelVolume: totalFuelVolume
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching fuel volume:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching fuel volume',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/fuel-grade-breakdown
 * Get fuel volume breakdown by fuel grade (Petrol, Diesel, Super Petrol, Super Diesel, AdBlue)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/fuel-grade-breakdown', async (req, res) => {
  try {
    console.log('⛽ [Backend] GET /api/dashboard/petrol-data/fuel-grade-breakdown');
    console.log('⛽ [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }

    const fuelGradeCodeNames = {
      '4000': 'Petrol',
      '4001': 'Diesel',
      '4002': 'Super Petrol',
      '4003': 'Super Diesel',
      '4008': 'AdBlue'
    };

    console.log('⛽ [Backend] Querying fuel grade breakdown from transactions');
    console.log('⛽ [Backend] Date range:', { startDate, endDate });

    // Query transactions table for volume by fuel grade nominal codes
    const fuelGradeQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(volume), 0) as total_volume,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;

    const result = await query(fuelGradeQuery, [startDate, endDate]);

    // Format the breakdown data
    const breakdown = result.rows.map(row => ({
      code: row.nominal_code,
      name: fuelGradeCodeNames[row.nominal_code] || `Code ${row.nominal_code}`,
      volume: parseFloat(row.total_volume || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    const totalVolume = breakdown.reduce((sum, item) => sum + item.volume, 0);

    console.log('⛽ [Backend] Fuel grade breakdown result:', {
      breakdownCount: breakdown.length,
      totalVolume,
      breakdown: breakdown.map(b => ({ name: b.name, volume: b.volume })),
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        breakdown,
        totalVolume,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching fuel grade breakdown:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching fuel grade breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/fuel-volume-breakdown
 * Get fuel volume breakdown by nominal code filtered by date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/fuel-volume-breakdown', async (req, res) => {
  try {
    console.log('⛽ [Backend] GET /api/dashboard/petrol-data/fuel-volume-breakdown');
    console.log('⛽ [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          breakdown: [],
          totalVolume: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    console.log('⛽ [Backend] Querying fuel volume breakdown from fuel_margin_data (Bunkered/Non-Bunkered)');
    console.log('⛽ [Backend] Date range:', { startDate, endDate });
    
    // Get fuel volume breakdown by bunkered/non-bunkered from fuel_margin_data (per documentation)
    const breakdownQuery = `
      SELECT 
        CASE WHEN s.is_bunkered = TRUE THEN 'Bunkered' ELSE 'Non-Bunkered' END as category,
        COALESCE(SUM(fmd.sale_volume), 0) as volume
      FROM fuel_margin_data fmd
      LEFT JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
      GROUP BY category
      ORDER BY category;
    `;
    
    // Also get total from fuel_margin_data to ensure accuracy
    const totalVolumeQuery = `
      SELECT COALESCE(SUM(sale_volume), 0) as total_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;
    
    const [breakdownResult, totalResult] = await Promise.all([
      query(breakdownQuery, allParams),
      query(totalVolumeQuery, allParams)
    ]);
    
    // Format the breakdown data
    const breakdown = breakdownResult.rows.map(row => ({
      code: row.category,
      name: row.category,
      volume: parseFloat(row.volume || 0),
      transactionCount: 0 // fuel_margin_data doesn't have transaction count
    }));
    
    // Use total from fuel_margin_data (authoritative source)
    const totalVolume = parseFloat(totalResult.rows[0]?.total_volume || 0);
    
    console.log('⛽ [Backend] Breakdown query result:', {
      breakdownCount: breakdown.length,
      totalVolume,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        breakdown,
        totalVolume,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching fuel volume breakdown:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching fuel volume breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/fuel-volume-by-site
 * Get fuel volume breakdown by site (site_code) for modal "Site-wise Fuel Volume"
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/fuel-volume-by-site', async (req, res) => {
  try {
    console.log('⛽ [Backend] GET /api/dashboard/petrol-data/fuel-volume-by-site');
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    if (startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          breakdown: [],
          totalVolume: 0,
          startDate,
          endDate
        }
      });
    }
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    const bySiteQuery = `
      SELECT
        fmd.site_code,
        COALESCE(SUM(fmd.sale_volume), 0) as volume
      FROM fuel_margin_data fmd
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
      GROUP BY fmd.site_code
      ORDER BY volume DESC;
    `;
    const totalVolumeQuery = `
      SELECT COALESCE(SUM(sale_volume), 0) as total_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;
    const [bySiteResult, totalResult] = await Promise.all([
      query(bySiteQuery, allParams),
      query(totalVolumeQuery, allParams)
    ]);
    const totalVolume = parseFloat(totalResult.rows[0]?.total_volume || 0);
    const breakdown = bySiteResult.rows.map(row => {
      const siteCode = parseInt(row.site_code, 10);
      const name = DEPT_TO_SITE_NAME[siteCode] || `Site ${row.site_code}`;
      return {
        code: String(row.site_code),
        name,
        volume: parseFloat(row.volume || 0)
      };
    });
    res.json({
      success: true,
      data: {
        breakdown,
        totalVolume,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching fuel volume by site:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching fuel volume by site',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/net-sales
 * Get total net sales for specific nominal codes filtered by date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/net-sales', async (req, res) => {
  try {
    console.log('💰 [Backend] GET /api/dashboard/petrol-data/net-sales');
    console.log('💰 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    console.log('💰 [Backend] Querying net sales from fuel_margin_data + other income');
    console.log('💰 [Backend] Date range:', { startDate, endDate });
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: { totalNetSales: 0 }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Get fuel net sales from fuel_margin_data (per documentation)
    const fuelNetSalesQuery = `
      SELECT 
        COALESCE(SUM(net_sales), 0) as fuel_net_sales
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;
    
    // Get other income from transactions (6100, 6101, 6102)
    const otherIncomeQuery = `
      SELECT 
        COALESCE(SUM(ABS(amount)), 0) as other_income
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;
    
    const [fuelResult, otherIncomeResult] = await Promise.all([
      query(fuelNetSalesQuery, allParams),
      query(otherIncomeQuery, [startDate, endDate])
    ]);
    
    const fuelNetSales = parseFloat(fuelResult.rows[0]?.fuel_net_sales || 0);
    const otherIncome = parseFloat(otherIncomeResult.rows[0]?.other_income || 0);
    const totalNetSales = fuelNetSales + otherIncome;
    
    console.log('💰 [Backend] Net sales query result:', {
      fuelNetSales,
      otherIncome,
      totalNetSales,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        totalNetSales: totalNetSales,
        fuelNetSales,
        otherIncome
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching net sales:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching net sales',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/net-sales-breakdown
 * Get net sales breakdown by nominal code filtered by date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/net-sales-breakdown', async (req, res) => {
  try {
    console.log('💰 [Backend] GET /api/dashboard/petrol-data/net-sales-breakdown');
    console.log('💰 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          breakdown: [],
          totalNetSales: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    console.log('💰 [Backend] Querying net sales breakdown from fuel_margin_data (Bunkered/Non-Bunkered)');
    console.log('💰 [Backend] Date range:', { startDate, endDate });
    
    // Get fuel net sales breakdown by bunkered/non-bunkered from fuel_margin_data (per documentation)
    const fuelSalesBreakdownQuery = `
      SELECT 
        CASE WHEN s.is_bunkered = TRUE THEN 'Bunkered' ELSE 'Non-Bunkered' END as category,
        COALESCE(SUM(fmd.net_sales), 0) as net_sales
      FROM fuel_margin_data fmd
      LEFT JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
      GROUP BY category
      ORDER BY category;
    `;
    
    // Get other income breakdown (6100, 6101, 6102)
    const otherIncomeBreakdownQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(ABS(amount)), 0) as income,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;
    
    const otherIncomeNames = {
      '6100': 'Fuel Commissions',
      '6101': 'Daily Facility Fees',
      '6102': 'Valeting Commissions'
    };
    
    const [fuelResult, otherIncomeResult] = await Promise.all([
      query(fuelSalesBreakdownQuery, allParams),
      query(otherIncomeBreakdownQuery, [startDate, endDate])
    ]);
    
    // Format fuel sales breakdown
    const fuelBreakdown = fuelResult.rows.map(row => ({
      category: row.category,
      netSales: parseFloat(row.net_sales || 0)
    }));
    
    // Format other income breakdown
    const otherIncomeBreakdown = otherIncomeResult.rows.map(row => ({
      code: row.nominal_code,
      name: otherIncomeNames[row.nominal_code] || `Code ${row.nominal_code}`,
      netSales: parseFloat(row.income || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));
    
    // Combine breakdowns
    const breakdown = [
      ...fuelBreakdown.map(item => ({
        code: item.category,
        name: item.category,
        netSales: item.netSales,
        transactionCount: 0
      })),
      ...otherIncomeBreakdown
    ];
    
    const bunkeredSales = fuelBreakdown.find(item => item.category === 'Bunkered')?.netSales || 0;
    const nonBunkeredSales = fuelBreakdown.find(item => item.category === 'Non-Bunkered')?.netSales || 0;
    const totalFuelSales = bunkeredSales + nonBunkeredSales;
    const totalOtherIncome = otherIncomeBreakdown.reduce((sum, item) => sum + item.netSales, 0);
    const totalNetSales = totalFuelSales + totalOtherIncome;
    
    console.log('💰 [Backend] Breakdown query result:', {
      breakdownCount: breakdown.length,
      totalNetSales,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        breakdown,
        totalNetSales,
        bunkeredSales,
        nonBunkeredSales,
        totalFuelSales,
        totalOtherIncome,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching net sales breakdown:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching net sales breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/profit
 * Get total profit (Fuel Profit + Other Income) for specific date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/profit', async (req, res) => {
  try {
    console.log('💰 [Backend] GET /api/dashboard/petrol-data/profit');
    console.log('💰 [Backend] Query params:', req.query);

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      console.error('❌ [Backend] Missing startDate or endDate parameter');
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('❌ [Backend] Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (startDateObj > endDateObj) {
      console.error('❌ [Backend] startDate is after endDate');
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }

    console.log('💰 [Backend] Querying profit from fuel_margin_data + other income');
    console.log('💰 [Backend] Date range:', { startDate, endDate });

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          totalProfit: 0,
          fuelProfit: 0,
          otherIncome: 0,
          fuelSales: 0,
          totalPurchases: 0
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Get fuel profit from fuel_margin_data (per documentation)
    const fuelProfitQuery = `
      SELECT 
        COALESCE(SUM(fuel_profit), 0) as fuel_profit,
        COALESCE(SUM(net_sales), 0) as fuel_sales,
        COALESCE(SUM(purchases), 0) as total_purchases
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    // Get other income from transactions (6100, 6101, 6102)
    const otherIncomeQuery = `
      SELECT COALESCE(SUM(ABS(amount)), 0) as other_income
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;

    const [fuelResult, otherIncomeResult] = await Promise.all([
      query(fuelProfitQuery, allParams),
      query(otherIncomeQuery, [startDate, endDate])
    ]);

    const fuelProfit = parseFloat(fuelResult.rows[0]?.fuel_profit || 0);
    const fuelSales = parseFloat(fuelResult.rows[0]?.fuel_sales || 0);
    const totalPurchases = parseFloat(fuelResult.rows[0]?.total_purchases || 0);
    const otherIncome = parseFloat(otherIncomeResult.rows[0]?.other_income || 0);
    const totalProfit = fuelProfit + otherIncome;

    console.log('💰 [Backend] Profit calculation result:', {
      fuelSales,
      totalPurchases,
      fuelProfit,
      otherIncome,
      totalProfit,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        totalProfit,
        fuelProfit,
        otherIncome,
        fuelSales,
        totalPurchases
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching profit:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching profit',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/profit-breakdown
 * Get profit breakdown by component
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/profit-breakdown', async (req, res) => {
  try {
    console.log('💰 [Backend] GET /api/dashboard/petrol-data/profit-breakdown');
    console.log('💰 [Backend] Query params:', req.query);

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    // Validate dates
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          fuelSalesBreakdown: [],
          purchasesBreakdown: [],
          otherIncomeBreakdown: [],
          totalFuelSales: 0,
          totalPurchases: 0,
          fuelProfit: 0,
          totalOtherIncome: 0,
          totalProfit: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get fuel profit breakdown by bunkered/non-bunkered from fuel_margin_data (per documentation)
    const fuelProfitBreakdownQuery = `
      SELECT 
        CASE WHEN s.is_bunkered = TRUE THEN 'Bunkered' ELSE 'Non-Bunkered' END as category,
        COALESCE(SUM(fmd.fuel_profit), 0) as fuel_profit,
        COALESCE(SUM(fmd.net_sales), 0) as net_sales,
        COALESCE(SUM(fmd.purchases), 0) as purchases
      FROM fuel_margin_data fmd
      LEFT JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
      GROUP BY category
      ORDER BY category;
    `;

    // Get other income breakdown (6100, 6101, 6102)
    const otherIncomeBreakdownQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(ABS(amount)), 0) as income,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;

    const otherIncomeNames = {
      '6100': 'Fuel Commissions',
      '6101': 'Daily Facility Fees',
      '6102': 'Valeting Commissions'
    };

    const [fuelResult, otherIncomeResult] = await Promise.all([
      query(fuelProfitBreakdownQuery, allParams),
      query(otherIncomeBreakdownQuery, [startDate, endDate])
    ]);

    // Format fuel profit breakdown
    const fuelSalesBreakdown = fuelResult.rows.map(row => ({
      category: row.category,
      fuelProfit: parseFloat(row.fuel_profit || 0),
      netSales: parseFloat(row.net_sales || 0),
      purchases: parseFloat(row.purchases || 0)
    }));

    const otherIncomeBreakdown = otherIncomeResult.rows.map(row => ({
      code: row.nominal_code,
      name: otherIncomeNames[row.nominal_code] || `Code ${row.nominal_code}`,
      amount: parseFloat(row.income || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    const bunkeredProfit = fuelSalesBreakdown.find(item => item.category === 'Bunkered')?.fuelProfit || 0;
    const nonBunkeredProfit = fuelSalesBreakdown.find(item => item.category === 'Non-Bunkered')?.fuelProfit || 0;
    const totalFuelProfit = bunkeredProfit + nonBunkeredProfit;
    const totalOtherIncome = otherIncomeBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalProfit = totalFuelProfit + totalOtherIncome;
    
    // Calculate totals for display
    const totalFuelSales = fuelSalesBreakdown.reduce((sum, item) => sum + item.netSales, 0);
    const totalPurchases = fuelSalesBreakdown.reduce((sum, item) => sum + item.purchases, 0);

    res.json({
      success: true,
      data: {
        fuelSalesBreakdown,
        otherIncomeBreakdown,
        bunkeredProfit,
        nonBunkeredProfit,
        totalFuelProfit,
        totalFuelSales,
        totalPurchases,
        totalOtherIncome,
        totalProfit,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching profit breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/avg-ppl
 * Get average profit per liter
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/avg-ppl', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          avgPPL: 0,
          fuelProfit: 0,
          totalVolume: 0
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get fuel profit and sale volume from fuel_margin_data (per documentation)
    const avgPPLQuery = `
      SELECT 
        COALESCE(SUM(fuel_profit), 0) as fuel_profit,
        COALESCE(SUM(sale_volume), 0) as sale_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(avgPPLQuery, allParams);

    const fuelProfit = parseFloat(result.rows[0]?.fuel_profit || 0);
    const totalVolume = parseFloat(result.rows[0]?.sale_volume || 0);
    const avgPPL = totalVolume > 0 ? (fuelProfit / totalVolume) * 100 : 0; // Convert to pence

    res.json({
      success: true,
      data: {
        avgPPL: parseFloat(avgPPL.toFixed(2)),
        fuelProfit,
        totalVolume
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching avg PPL:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching avg PPL',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/actual-ppl
 * Get actual profit per liter (overheads per liter)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/actual-ppl', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          actualPPL: 0,
          totalOverheads: 0,
          totalVolume: 0
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get total overheads (7000-7999) from transactions
    const overheadsQuery = `
      SELECT COALESCE(SUM(ABS(amount)), 0) as total_overheads
      FROM transactions
      WHERE nominal_code::integer >= 7000 AND nominal_code::integer < 8000
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;

    // Get total volume from fuel_margin_data (per documentation)
    const volumeQuery = `
      SELECT COALESCE(SUM(sale_volume), 0) as total_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const [overheadsResult, volumeResult] = await Promise.all([
      query(overheadsQuery, [startDate, endDate]),
      query(volumeQuery, allParams)
    ]);

    const totalOverheads = parseFloat(overheadsResult.rows[0]?.total_overheads || 0);
    const totalVolume = parseFloat(volumeResult.rows[0]?.total_volume || 0);
    const actualPPL = totalVolume > 0 ? (totalOverheads / totalVolume) * 100 : 0; // Convert to pence

    res.json({
      success: true,
      data: {
        actualPPL: parseFloat(actualPPL.toFixed(2)),
        totalOverheads,
        totalVolume
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching actual PPL:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching actual PPL',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/actual-ppl-breakdown
 * Get overhead breakdown by category
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/actual-ppl-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Get overheads grouped by category ranges
    const overheadsQuery = `
      SELECT 
        CASE 
          WHEN nominal_code::integer >= 7000 AND nominal_code::integer < 7100 THEN 'Labour (7000-7099)'
          WHEN nominal_code::integer >= 7100 AND nominal_code::integer < 7200 THEN 'Rent & Rates (7100-7199)'
          WHEN nominal_code::integer >= 7200 AND nominal_code::integer < 7300 THEN 'Utilities (7200-7299)'
          WHEN nominal_code::integer >= 7300 AND nominal_code::integer < 7400 THEN 'Maintenance (7300-7399)'
          WHEN nominal_code::integer >= 7400 AND nominal_code::integer < 7500 THEN 'Insurance (7400-7499)'
          WHEN nominal_code::integer >= 7500 AND nominal_code::integer < 7600 THEN 'Professional Fees (7500-7599)'
          WHEN nominal_code::integer >= 7600 AND nominal_code::integer < 7700 THEN 'Marketing (7600-7699)'
          WHEN nominal_code::integer >= 7700 AND nominal_code::integer < 7800 THEN 'Travel (7700-7799)'
          WHEN nominal_code::integer >= 7800 AND nominal_code::integer < 7900 THEN 'Repairs & Renewals (7800-7899)'
          WHEN nominal_code::integer >= 7900 AND nominal_code::integer < 8000 THEN 'Bank & Finance (7900-7999)'
          ELSE 'Other'
        END as category,
        COALESCE(SUM(ABS(amount)), 0) as amount,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code::integer >= 7000 AND nominal_code::integer < 8000
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY 
        CASE 
          WHEN nominal_code::integer >= 7000 AND nominal_code::integer < 7100 THEN 'Labour (7000-7099)'
          WHEN nominal_code::integer >= 7100 AND nominal_code::integer < 7200 THEN 'Rent & Rates (7100-7199)'
          WHEN nominal_code::integer >= 7200 AND nominal_code::integer < 7300 THEN 'Utilities (7200-7299)'
          WHEN nominal_code::integer >= 7300 AND nominal_code::integer < 7400 THEN 'Maintenance (7300-7399)'
          WHEN nominal_code::integer >= 7400 AND nominal_code::integer < 7500 THEN 'Insurance (7400-7499)'
          WHEN nominal_code::integer >= 7500 AND nominal_code::integer < 7600 THEN 'Professional Fees (7500-7599)'
          WHEN nominal_code::integer >= 7600 AND nominal_code::integer < 7700 THEN 'Marketing (7600-7699)'
          WHEN nominal_code::integer >= 7700 AND nominal_code::integer < 7800 THEN 'Travel (7700-7799)'
          WHEN nominal_code::integer >= 7800 AND nominal_code::integer < 7900 THEN 'Repairs & Renewals (7800-7899)'
          WHEN nominal_code::integer >= 7900 AND nominal_code::integer < 8000 THEN 'Bank & Finance (7900-7999)'
          ELSE 'Other'
        END
      ORDER BY amount DESC;
    `;

    const result = await query(overheadsQuery, [startDate, endDate]);

    const breakdown = result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.amount || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    const totalOverheads = breakdown.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      data: {
        breakdown,
        totalOverheads,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching actual PPL breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching actual PPL breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/labour-cost
 * Get total labour cost (Gross Wages + Employers N.I. + Staff Pensions)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/labour-cost', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    const labourCostQuery = `
      SELECT
        COALESCE(SUM(ABS(CASE WHEN nominal_code = '7000' THEN amount ELSE 0 END)), 0) as gross_wages,
        COALESCE(SUM(ABS(CASE WHEN nominal_code = '7006' THEN amount ELSE 0 END)), 0) as employers_ni,
        COALESCE(SUM(ABS(CASE WHEN nominal_code = '7007' THEN amount ELSE 0 END)), 0) as staff_pensions
      FROM transactions
      WHERE nominal_code IN ('7000', '7006', '7007')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(labourCostQuery, [startDate, endDate]);

    const grossWages = parseFloat(result.rows[0]?.gross_wages || 0);
    const employersNI = parseFloat(result.rows[0]?.employers_ni || 0);
    const staffPensions = parseFloat(result.rows[0]?.staff_pensions || 0);
    const totalLabourCost = grossWages + employersNI + staffPensions;

    res.json({
      success: true,
      data: {
        totalLabourCost,
        grossWages,
        employersNI,
        staffPensions
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching labour cost:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching labour cost',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/labour-cost-breakdown
 * Get labour cost breakdown by component
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/labour-cost-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    const breakdownQuery = `
      SELECT
        nominal_code,
        COALESCE(SUM(ABS(amount)), 0) as amount,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('7000', '7006', '7007')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;

    const result = await query(breakdownQuery, [startDate, endDate]);

    const labourCodeNames = {
      '7000': 'Gross Wages',
      '7006': 'Employers N.I.',
      '7007': 'Staff Pensions'
    };

    const breakdown = result.rows.map(row => ({
      code: row.nominal_code,
      name: labourCodeNames[row.nominal_code] || `Code ${row.nominal_code}`,
      amount: parseFloat(row.amount || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    const totalLabourCost = breakdown.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      data: {
        breakdown,
        totalLabourCost,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching labour cost breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching labour cost breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/active-sites
 * Get count of active sites with transactions in date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/active-sites', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: { activeSites: 0 }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get active sites from fuel_margin_data (per documentation)
    const activeSitesQuery = `
      SELECT COUNT(DISTINCT site_code) as active_sites
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(activeSitesQuery, allParams);

    const activeSites = parseInt(result.rows[0]?.active_sites || 0);

    res.json({
      success: true,
      data: {
        activeSites
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching active sites:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active sites',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/profit-margin
 * Get profit margin percentage
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/profit-margin', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          profitMargin: 0,
          fuelProfit: 0,
          fuelSales: 0
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get fuel profit and net sales from fuel_margin_data (per documentation)
    const profitMarginQuery = `
      SELECT 
        COALESCE(SUM(fuel_profit), 0) as fuel_profit,
        COALESCE(SUM(net_sales), 0) as fuel_net_sales
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(profitMarginQuery, allParams);

    const fuelProfit = parseFloat(result.rows[0]?.fuel_profit || 0);
    const fuelSales = parseFloat(result.rows[0]?.fuel_net_sales || 0);
    const profitMargin = fuelSales > 0 ? (fuelProfit / fuelSales) * 100 : 0;

    res.json({
      success: true,
      data: {
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        fuelProfit,
        fuelSales
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching profit margin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit margin',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/avg-sale-per-site
 * Get average sale per site
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/avg-sale-per-site', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          avgSalePerSite: 0,
          totalNetSales: 0,
          activeSites: 0
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get fuel net sales from fuel_margin_data (per documentation)
    const fuelNetSalesQuery = `
      SELECT 
        COALESCE(SUM(net_sales), 0) as fuel_net_sales
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    // Get other income from transactions
    const otherIncomeQuery = `
      SELECT COALESCE(SUM(ABS(amount)), 0) as other_income
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;

    // Get active sites from fuel_margin_data
    const activeSitesQuery = `
      SELECT COUNT(DISTINCT site_code) as active_sites
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const [fuelNetSalesResult, otherIncomeResult, activeSitesResult] = await Promise.all([
      query(fuelNetSalesQuery, allParams),
      query(otherIncomeQuery, [startDate, endDate]),
      query(activeSitesQuery, allParams)
    ]);

    const fuelNetSales = parseFloat(fuelNetSalesResult.rows[0]?.fuel_net_sales || 0);
    const otherIncome = parseFloat(otherIncomeResult.rows[0]?.other_income || 0);
    const totalNetSales = fuelNetSales + otherIncome;
    const activeSites = parseInt(activeSitesResult.rows[0]?.active_sites || 0);
    const avgSalePerSite = activeSites > 0 ? totalNetSales / activeSites : 0;

    res.json({
      success: true,
      data: {
        avgSalePerSite: parseFloat(avgSalePerSite.toFixed(2)),
        totalNetSales,
        activeSites
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching avg sale per site:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching avg sale per site',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/total-purchases
 * Get total purchases (same as net sales but for purchases)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/total-purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: { totalPurchases: 0 }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get total purchases from fuel_margin_data (per documentation)
    const purchasesQuery = `
      SELECT COALESCE(SUM(purchases), 0) as total_purchases
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(purchasesQuery, allParams);
    const totalPurchases = parseFloat(result.rows[0]?.total_purchases || 0);

    res.json({
      success: true,
      data: {
        totalPurchases
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching total purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching total purchases',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/total-purchases-breakdown
 * Get purchases breakdown by nominal code
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/total-purchases-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          breakdown: [],
          totalPurchases: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    const purchaseCodeNames = {
      '5000': 'Petrol- Purchases',
      '5001': 'Diesel- Purchases',
      '5003': 'Super Petrol- Purchases',
      '5004': 'Super Diesel- Purchases',
      '5014': 'AdBlue- Purchases'
    };

    // Get total purchases from fuel_margin_data (per documentation - this is the authoritative total)
    const totalPurchasesQuery = `
      SELECT COALESCE(SUM(purchases), 0) as total_purchases
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1);
    `;

    // Get breakdown by nominal code from transactions (for detail, but total should match fuel_margin_data)
    const breakdownQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(ABS(amount)), 0) as purchases,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('5000', '5001', '5003', '5004', '5014')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;

    const [totalResult, breakdownResult] = await Promise.all([
      query(totalPurchasesQuery, allParams),
      query(breakdownQuery, [startDate, endDate])
    ]);

    const totalPurchases = parseFloat(totalResult.rows[0]?.total_purchases || 0);

    const breakdown = breakdownResult.rows.map(row => ({
      code: row.nominal_code,
      name: purchaseCodeNames[row.nominal_code] || `Nominal Code ${row.nominal_code}`,
      purchases: parseFloat(row.purchases || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    res.json({
      success: true,
      data: {
        breakdown,
        totalPurchases,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching total purchases breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching total purchases breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/bank-balance
 * Get bank closing balance (sum of all transactions up to endDate, not filtered by startDate)
 * Query params: endDate (YYYY-MM-DD) - only endDate needed for closing balance
 */
router.get('/petrol-data/bank-balance', async (req, res) => {
  try {
    const { endDate } = req.query;

    if (!endDate) {
      return res.status(400).json({
        success: false,
        message: 'endDate is required (format: YYYY-MM-DD)'
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Bank balance is sum of ALL transactions up to endDate (not filtered by startDate)
    const bankBalanceQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN nominal_code = '1223' THEN amount ELSE 0 END), 0) as edmonton,
        COALESCE(SUM(CASE WHEN nominal_code = '1224' THEN amount ELSE 0 END), 0) as lloyds,
        COALESCE(SUM(CASE WHEN nominal_code = '1200' THEN amount ELSE 0 END), 0) as prl_hsbc
      FROM transactions
      WHERE nominal_code IN ('1200', '1223', '1224')
        AND transaction_date <= $1::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL);
    `;

    const result = await query(bankBalanceQuery, [endDate]);

    const edmonton = parseFloat(result.rows[0]?.edmonton || 0);
    const lloyds = parseFloat(result.rows[0]?.lloyds || 0);
    const prlHsbc = parseFloat(result.rows[0]?.prl_hsbc || 0);
    const totalBalance = edmonton + lloyds + prlHsbc;

    res.json({
      success: true,
      data: {
        totalBalance,
        edmonton,
        lloyds,
        prlHsbc
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching bank balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bank balance',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/bank-balance-breakdown
 * Get bank balance breakdown by account
 * Query params: endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/bank-balance-breakdown', async (req, res) => {
  try {
    const { endDate } = req.query;

    if (!endDate) {
      return res.status(400).json({
        success: false,
        message: 'endDate is required (format: YYYY-MM-DD)'
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const breakdownQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(amount), 0) as balance,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('1200', '1223', '1224')
        AND transaction_date <= $1::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;

    const result = await query(breakdownQuery, [endDate]);

    const accountNames = {
      '1200': 'PRL HSBC',
      '1223': 'Edmonton A/C',
      '1224': 'Lloyds Bank'
    };

    const breakdown = result.rows.map(row => ({
      code: row.nominal_code,
      name: accountNames[row.nominal_code] || `Account ${row.nominal_code}`,
      balance: parseFloat(row.balance || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    const totalBalance = breakdown.reduce((sum, item) => sum + item.balance, 0);

    res.json({
      success: true,
      data: {
        breakdown,
        totalBalance,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching bank balance breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bank balance breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/bunkered-breakdown
 * Get bunkered sites breakdown (Volume, Sales, Profit)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/bunkered-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          volume: 0,
          sales: 0,
          profit: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get bunkered breakdown from fuel_margin_data (per documentation)
    const bunkeredQuery = `
      SELECT 
        COALESCE(SUM(fmd.sale_volume), 0) as volume,
        COALESCE(SUM(fmd.net_sales), 0) as sales,
        COALESCE(SUM(fmd.fuel_profit), 0) as profit
      FROM fuel_margin_data fmd
      JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
        AND s.is_bunkered = TRUE;
    `;

    const result = await query(bunkeredQuery, allParams);

    res.json({
      success: true,
      data: {
        volume: parseFloat(result.rows[0]?.volume || 0),
        sales: parseFloat(result.rows[0]?.sales || 0),
        profit: parseFloat(result.rows[0]?.profit || 0),
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching bunkered breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bunkered breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/non-bunkered-breakdown
 * Get non-bunkered sites breakdown (Volume, Sales, Profit)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/non-bunkered-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          volume: 0,
          sales: 0,
          profit: 0,
          startDate,
          endDate
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];

    // Get non-bunkered breakdown from fuel_margin_data (per documentation)
    const nonBunkeredQuery = `
      SELECT 
        COALESCE(SUM(fmd.sale_volume), 0) as volume,
        COALESCE(SUM(fmd.net_sales), 0) as sales,
        COALESCE(SUM(fmd.fuel_profit), 0) as profit
      FROM fuel_margin_data fmd
      JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
        AND (s.is_bunkered = FALSE OR s.is_bunkered IS NULL);
    `;

    const result = await query(nonBunkeredQuery, allParams);

    res.json({
      success: true,
      data: {
        volume: parseFloat(result.rows[0]?.volume || 0),
        sales: parseFloat(result.rows[0]?.sales || 0),
        profit: parseFloat(result.rows[0]?.profit || 0),
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching non-bunkered breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-bunkered breakdown',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/other-income-summary
 * Get other income total (for the card display)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/other-income-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }

    // Get other income total from transactions (6100, 6101, 6102)
    const otherIncomeQuery = `
      SELECT 
        COALESCE(SUM(ABS(amount)), 0) as total
      FROM transactions
      WHERE nominal_code IN ('6100', '6101', '6102')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;

    const result = await query(otherIncomeQuery, [startDate, endDate]);

    res.json({
      success: true,
      data: {
        total: parseFloat(result.rows[0]?.total || 0),
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching other income summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching other income summary',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/monthly-trends
 * Get monthly fuel performance trends across all sites
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/monthly-trends', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/petrol-data/monthly-trends');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get monthly trends from fuel_margin_data
    // This ensures consistency with the Profit KPI card which uses fuel_margin_data
    const monthlyTrendsQuery = `
      SELECT 
        month,
        COALESCE(SUM(net_sales), 0) as sales,
        COALESCE(SUM(sale_volume), 0) as volume,
        COALESCE(SUM(fuel_profit), 0) as profit
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1)
      GROUP BY month
      ORDER BY month;
    `;
    
    const result = await query(monthlyTrendsQuery, allParams);
    
    const monthlyData = result.rows.map(row => ({
      month_name: monthNames[row.month] || `Month ${row.month}`,
      sales: parseFloat(row.sales || 0),
      volume: parseFloat(row.volume || 0),
      profit: parseFloat(row.profit || 0)
    }));
    
    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching monthly trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly trends',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/daily-data
 * Get daily/date-wise data across all sites
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/daily-data', async (req, res) => {
  try {
    console.log('📅 [Backend] GET /api/dashboard/petrol-data/daily-data');
    console.log('📅 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }
    
    // Get daily fuel sales from transactions (nominal codes 4000-4008)
    const dailySalesQuery = `
      SELECT 
        transaction_date as date,
        SUM(ABS(amount)) as fuel_sales,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY transaction_date
      ORDER BY transaction_date;
    `;
    
    // Get daily purchases to calculate profit
    const dailyPurchasesQuery = `
      SELECT 
        transaction_date as date,
        SUM(ABS(amount)) as fuel_purchases
      FROM transactions
      WHERE nominal_code IN ('5000', '5001', '5003', '5004', '5014')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY transaction_date
      ORDER BY transaction_date;
    `;
    
    // Get monthly volume from fuel_margin_data to calculate daily average
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    let monthlyVolumeMap = new Map();
    if (years.length > 0 && months.length > 0) {
      const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
      const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
      const allParams = [...years, ...months];
      
      const monthlyVolumeQuery = `
        SELECT 
          year,
          month,
          SUM(sale_volume) as total_volume
        FROM fuel_margin_data
        WHERE year IN (${yearPlaceholders})
          AND month IN (${monthPlaceholders})
          AND site_code NOT IN (0, 1)
        GROUP BY year, month;
      `;
      
      const volumeResult = await query(monthlyVolumeQuery, allParams);
      volumeResult.rows.forEach(row => {
        const key = `${row.year}-${row.month}`;
        // Calculate days in month
        const daysInMonth = new Date(row.year, row.month, 0).getDate();
        monthlyVolumeMap.set(key, {
          volume: parseFloat(row.total_volume || 0),
          dayCount: daysInMonth
        });
      });
    }
    
    const [salesResult, purchasesResult] = await Promise.all([
      query(dailySalesQuery, [startDate, endDate]),
      query(dailyPurchasesQuery, [startDate, endDate])
    ]);
    
    // Create maps for quick lookup
    const purchasesMap = new Map();
    purchasesResult.rows.forEach(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      purchasesMap.set(dateKey, parseFloat(row.fuel_purchases || 0));
    });
    
    // Combine data
    const dailyData = salesResult.rows.map(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      const date = new Date(row.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month}`;
      
      const fuelSales = parseFloat(row.fuel_sales || 0);
      const fuelPurchases = purchasesMap.get(dateKey) || 0;
      const profit = fuelSales - fuelPurchases;
      
      // Get daily volume from monthly average
      const monthlyData = monthlyVolumeMap.get(monthKey);
      let fuelVolume = 0;
      if (monthlyData && monthlyData.dayCount > 0) {
        // Distribute monthly volume evenly across days
        fuelVolume = monthlyData.volume / monthlyData.dayCount;
      }
      
      // Calculate PPL
      const avgPPL = fuelVolume > 0 ? (profit / fuelVolume) * 100 : 0;
      
      return {
        date: dateKey,
        fuel_volume: parseFloat(fuelVolume.toFixed(2)),
        fuel_sales: fuelSales,
        avg_ppl: parseFloat(avgPPL.toFixed(2))
      };
    });
    
    res.json({
      success: true,
      data: dailyData
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching daily data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily data',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/ppl-comparison
 * Get PPL comparison (Avg PPL vs Actual PPL) across all sites
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/ppl-comparison', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/petrol-data/ppl-comparison');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Get fuel profit and volume from fuel_margin_data for avg_ppl
    const fuelDataQuery = `
      SELECT 
        year,
        month,
        SUM(fuel_profit) as fuel_profit,
        SUM(sale_volume) as sale_volume
      FROM fuel_margin_data
      WHERE year IN (${yearPlaceholders})
        AND month IN (${monthPlaceholders})
        AND site_code NOT IN (0, 1)
      GROUP BY year, month
      ORDER BY year, month;
    `;
    
    // Get overheads from transactions (7000-7999) for actual_ppl
    const overheadsQuery = `
      SELECT 
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(ABS(amount)) as total_overheads
      FROM transactions
      WHERE nominal_code::integer >= 7000 AND nominal_code::integer < 8000
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1)
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
      ORDER BY year, month;
    `;
    
    const [fuelResult, overheadsResult] = await Promise.all([
      query(fuelDataQuery, allParams),
      query(overheadsQuery, [startDate, endDate])
    ]);
    
    // Combine data by year/month
    const pplDataMap = new Map();
    
    fuelResult.rows.forEach(row => {
      const key = `${row.year}-${row.month}`;
      const fuelProfit = parseFloat(row.fuel_profit || 0);
      const saleVolume = parseFloat(row.sale_volume || 0);
      const avgPPL = saleVolume > 0 ? (fuelProfit / saleVolume) * 100 : 0;
      
      pplDataMap.set(key, {
        year: row.year,
        month: row.month,
        avg_ppl: avgPPL,
        sale_volume: saleVolume,
        actual_ppl: 0 // Will be filled from overheads
      });
    });
    
    overheadsResult.rows.forEach(row => {
      const key = `${row.year}-${row.month}`;
      const totalOverheads = parseFloat(row.total_overheads || 0);
      
      const existing = pplDataMap.get(key);
      if (existing && existing.sale_volume > 0) {
        // Calculate actual_ppl = (overheads / volume) * 100
        const actualPPL = (totalOverheads / existing.sale_volume) * 100;
        existing.actual_ppl = actualPPL;
      }
    });
    
    // Convert to array and format dates
    const pplData = Array.from(pplDataMap.values()).map(item => {
      // Get the last day of the month to display the month's aggregated data
      const lastDay = new Date(item.year, item.month, 0).getDate();
      // Format date as YYYY-MM-DD without timezone conversion issues
      const dateStr = `${item.year}-${String(item.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        date: dateStr,
        avg_ppl: parseFloat(item.avg_ppl.toFixed(2)),
        actual_ppl: parseFloat(item.actual_ppl.toFixed(2))
      };
    });
    
    res.json({
      success: true,
      data: pplData
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching PPL comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PPL comparison',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/profit-by-site
 * Get profit distribution by site (top 10) across all sites
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/profit-by-site', async (req, res) => {
  try {
    console.log('💰 [Backend] GET /api/dashboard/petrol-data/profit-by-site');
    console.log('💰 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Get profit by site from fuel_margin_data
    const profitBySiteQuery = `
      SELECT 
        s.site_name,
        SUM(fmd.fuel_profit) as profit
      FROM fuel_margin_data fmd
      JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code NOT IN (0, 1)
      GROUP BY s.site_code, s.site_name
      ORDER BY profit DESC
      LIMIT 10;
    `;
    
    const result = await query(profitBySiteQuery, allParams);
    
    const profitData = result.rows.map(row => ({
      site_name: row.site_name,
      profit: parseFloat(row.profit || 0)
    }));
    
    res.json({
      success: true,
      data: profitData
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching profit by site:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit by site',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/petrol-data/site-rankings
 * Get site rankings (top 5 and bottom 5) by net sales
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/petrol-data/site-rankings', async (req, res) => {
  try {
    console.log('📊 [Backend] GET /api/dashboard/petrol-data/site-rankings');
    console.log('📊 [Backend] Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format or range'
      });
    }
    
    // Convert date range to year/month combinations
    const { years, months } = getYearMonthRangeFromDates(startDate, endDate);
    
    if (years.length === 0 || months.length === 0) {
      return res.json({
        success: true,
        data: {
          top: [],
          bottom: []
        }
      });
    }
    
    // Build parameterized query for year/month combinations
    const yearPlaceholders = years.map((_, i) => `$${i + 1}`).join(',');
    const monthPlaceholders = months.map((_, i) => `$${years.length + i + 1}`).join(',');
    const allParams = [...years, ...months];
    
    // Get site rankings from fuel_margin_data; use DEPT_TO_SITE_NAME for display names (sites 6–45 only)
    const siteRankingsQuery = `
      SELECT 
        fmd.site_code,
        s.site_name,
        SUM(fmd.net_sales) as net_sales,
        SUM(fmd.sale_volume) as sale_volume,
        SUM(fmd.fuel_profit) as fuel_profit
      FROM fuel_margin_data fmd
      LEFT JOIN sites s ON fmd.site_code = s.site_code
      WHERE fmd.year IN (${yearPlaceholders})
        AND fmd.month IN (${monthPlaceholders})
        AND fmd.site_code >= 6 AND fmd.site_code <= 45
      GROUP BY fmd.site_code, s.site_name
      ORDER BY net_sales DESC;
    `;
    
    const result = await query(siteRankingsQuery, allParams);
    
    const siteData = result.rows.map(row => {
      const siteCode = row.site_code != null ? Number(row.site_code) : null;
      const displayName = (siteCode != null && DEPT_TO_SITE_NAME[siteCode]) ? DEPT_TO_SITE_NAME[siteCode] : (row.site_name || 'Dept ' + (siteCode ?? row.site_code));
      // Treat negative stored values as positive for display/calculation
      const netSales = Math.abs(parseFloat(row.net_sales || 0));
      const saleVolume = parseFloat(row.sale_volume || 0);
      const fuelProfit = Math.abs(parseFloat(row.fuel_profit || 0));
      const ppl = saleVolume > 0 ? (fuelProfit / saleVolume) * 100 : 0;
      const margin = netSales > 0 ? (fuelProfit / netSales) * 100 : 0;
      
      return {
        site_code: siteCode ?? row.site_code,
        name: displayName,
        site_name: displayName,
        net_sales: netSales,
        fuel_profit: fuelProfit,
        ppl: parseFloat(ppl.toFixed(2)),
        margin: parseFloat(margin.toFixed(2))
      };
    });
    
    // Rank by profit magnitude (always positive)
    siteData.sort((a, b) => (b.fuel_profit ?? 0) - (a.fuel_profit ?? 0));
    const top = siteData.slice(0, 5);
    const bottom = siteData.slice(-5).reverse();
    
    res.json({
      success: true,
      data: {
        top,
        bottom
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching site rankings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site rankings',
      error: error.message
    });
  }
});

export default router;

