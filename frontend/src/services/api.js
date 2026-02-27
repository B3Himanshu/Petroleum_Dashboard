/**
 * API Service
 * Handles all backend API communication
 */

// Backend default port is 2000 (server.js). Set VITE_API_URL if you use PORT=3001 in backend/.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2000';

/**
 * Generic fetch wrapper with error handling
 */
const fetchAPI = async (endpoint, options = {}) => {
  try {
    console.log(`🔵 [API Request] ${endpoint}`, {
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body) : undefined,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      console.error(`❌ [API Error] ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
        url: `${API_BASE_URL}${endpoint}`
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ [API Response] ${endpoint}`, {
      success: data.success,
      dataLength: Array.isArray(data.data) ? data.data.length : data.data ? Object.keys(data.data).length : 0,
      data: data,
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.error(`❌ [API Error] ${endpoint}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Sites API
 */
export const sitesAPI = {
  /**
   * Get all sites
   */
  getAll: async () => {
    console.log('🏢 [Frontend] sitesAPI.getAll called');
    const response = await fetchAPI('/api/sites');
    console.log('🏢 [Frontend] sitesAPI.getAll response:', {
      count: response.count,
      sitesCount: response.data?.length || 0
    });
    return response.data || [];
  },

  /**
   * Get site by ID
   */
  getById: async (id) => {
    console.log('🏢 [Frontend] sitesAPI.getById called', { id });
    const response = await fetchAPI(`/api/sites/${id}`);
    console.log('🏢 [Frontend] sitesAPI.getById response:', response.data);
    return response.data;
  },

  /**
   * Get sites by city
   */
  getByCity: async (cityId) => {
    if (cityId === 'all') {
      return sitesAPI.getAll();
    }
    const response = await fetchAPI(`/api/sites/city/${cityId}`);
    return response.data || [];
  },

  /**
   * Get list of unique cities
   */
  getCities: async () => {
    const response = await fetchAPI('/api/sites/cities/list');
    return response.data || [];
  },
};

// When 1–28 site IDs (dept numbers) selected, add siteIds to query; when all 29 or none, omit (backend = all sites).
function appendSiteIdsToParams(params, siteIds) {
  const ids = Array.isArray(siteIds) ? siteIds : (siteIds != null ? [siteIds] : []);
  if (ids.length > 0 && ids.length < 29) {
    params.set('siteIds', ids.join(','));
  }
}

/**
 * Dashboard API
 */
export const dashboardAPI = {
  /**
   * Get dashboard metrics
   * @param {number} siteId - Site code
   * @param {number|number[]} month - Month (1-12) or array of months
   * @param {number|number[]} year - Year or array of years
   */
  getMetrics: async (siteId, month, year) => {
    console.log('📊 [Frontend] getMetrics called', {
      siteId,
      month,
      year,
      monthType: Array.isArray(month) ? 'array' : typeof month,
      yearType: Array.isArray(year) ? 'array' : typeof year
    });

    const params = new URLSearchParams({
      siteId: siteId.toString(),
    });
    
    // Handle multiple months/years
    if (Array.isArray(month) && month.length > 0) {
      params.append('months', month.join(','));
      console.log('📊 [Frontend] Adding months array:', month.join(','));
    } else if (month) {
      params.append('month', month.toString());
      console.log('📊 [Frontend] Adding single month:', month);
    }
    
    if (Array.isArray(year) && year.length > 0) {
      params.append('years', year.join(','));
      console.log('📊 [Frontend] Adding years array:', year.join(','));
    } else if (year) {
      params.append('year', year.toString());
      console.log('📊 [Frontend] Adding single year:', year);
    }
    
    const fullUrl = `/api/dashboard/metrics?${params}`;
    console.log('📊 [Frontend] Full API URL:', fullUrl);
    
    const response = await fetchAPI(fullUrl);
    console.log('📊 [Frontend] getMetrics response:', response);
    return response.data;
  },

  /**
   * Get monthly performance chart data
   * @param {number} siteId - Site code
   * @param {number|number[]} year - Year or array of years
   */
  getMonthlyPerformance: async (siteId, year) => {
    console.log('📈 [Frontend] getMonthlyPerformance called', {
      siteId,
      year,
      yearType: Array.isArray(year) ? 'array' : typeof year
    });

    const params = new URLSearchParams({
      siteId: siteId.toString(),
    });
    
    // Handle multiple years
    if (Array.isArray(year) && year.length > 0) {
      params.append('years', year.join(','));
      console.log('📈 [Frontend] Adding years array:', year.join(','));
    } else if (year) {
      params.append('year', year.toString());
      console.log('📈 [Frontend] Adding single year:', year);
    }
    
    const fullUrl = `/api/dashboard/charts/monthly-performance?${params}`;
    console.log('📈 [Frontend] Full API URL:', fullUrl);
    
    const response = await fetchAPI(fullUrl);
    console.log('📈 [Frontend] getMonthlyPerformance response:', response);
    return response.data;
  },

  /**
   * Get sales distribution chart data
   * @param {number} siteId - Site code
   * @param {number|number[]} month - Month (1-12) or array of months
   * @param {number|number[]} year - Year or array of years
   */
  getSalesDistribution: async (siteId, month, year) => {
    console.log('📊 [Frontend] getSalesDistribution called', {
      siteId,
      month,
      year,
      monthType: Array.isArray(month) ? 'array' : typeof month,
      yearType: Array.isArray(year) ? 'array' : typeof year
    });

    const params = new URLSearchParams({
      siteId: siteId.toString(),
    });
    
    // Handle multiple months/years
    if (Array.isArray(month) && month.length > 0) {
      params.append('months', month.join(','));
      console.log('📊 [Frontend] Adding months array:', month.join(','));
    } else if (month) {
      params.append('month', month.toString());
      console.log('📊 [Frontend] Adding single month:', month);
    }
    
    if (Array.isArray(year) && year.length > 0) {
      params.append('years', year.join(','));
      console.log('📊 [Frontend] Adding years array:', year.join(','));
    } else if (year) {
      params.append('year', year.toString());
      console.log('📊 [Frontend] Adding single year:', year);
    }
    
    const fullUrl = `/api/dashboard/charts/sales-distribution?${params}`;
    console.log('📊 [Frontend] Full API URL:', fullUrl);
    
    const response = await fetchAPI(fullUrl);
    console.log('📊 [Frontend] getSalesDistribution response:', response);
    return response.data;
  },

  /**
   * Get status cards data
   * @param {number} siteId - Site code
   */
  getStatus: async (siteId) => {
    console.log('📋 [Frontend] getStatus called', { siteId });
    const params = new URLSearchParams({
      siteId: siteId.toString(),
    });
    const fullUrl = `/api/dashboard/status?${params}`;
    console.log('📋 [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('📋 [Frontend] getStatus response:', response);
    return response.data;
  },

  /**
   * Get date-wise/daily sales data
   * @param {number} siteId - Site code
   * @param {number|number[]} month - Month (1-12) or array of months
   * @param {number|number[]} year - Year or array of years
   */
  getDateWiseData: async (siteId, month, year) => {
    console.log('📅 [Frontend] getDateWiseData called', { siteId, month, year });
    
    const params = new URLSearchParams({
      siteId: siteId.toString(),
    });
    
    if (Array.isArray(month) && month.length > 0) {
      params.append('months', month.join(','));
    } else if (month) {
      params.append('month', month.toString());
    }
    
    if (Array.isArray(year) && year.length > 0) {
      params.append('years', year.join(','));
    } else if (year) {
      params.append('year', year.toString());
    }
    
    const fullUrl = `/api/dashboard/charts/date-wise?${params}`;
    console.log('📅 [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('📅 [Frontend] getDateWiseData response:', response);
    return response.data;
  },

  /**
   * Get total sales across all sites
   * @param {number|number[]|null|undefined} month - Month (1-12) or array of months. If null/undefined, gets all months.
   * @param {number|number[]|null|undefined} year - Year or array of years. If null/undefined, gets all years.
   */
  getTotalSales: async (month, year) => {
    console.log('📊 [Frontend] getTotalSales called', { month, year });
    
    const params = new URLSearchParams();
    
    // Only add month/year params if they are provided
    if (month !== null && month !== undefined) {
      if (Array.isArray(month) && month.length > 0) {
        params.append('months', month.join(','));
      } else if (month) {
        params.append('month', month.toString());
      }
    }
    
    if (year !== null && year !== undefined) {
      if (Array.isArray(year) && year.length > 0) {
        params.append('years', year.join(','));
      } else if (year) {
        params.append('year', year.toString());
      }
    }
    
    const fullUrl = params.toString() 
      ? `/api/dashboard/total-sales?${params}` 
      : `/api/dashboard/total-sales`;
    console.log('📊 [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('📊 [Frontend] getTotalSales response:', response);
    return response.data;
  },

  /**
   * Get petrol fuel volume for specific nominal codes filtered by date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolFuelVolume: async (startDate, endDate, siteIds) => {
    console.log('⛽ [Frontend] getPetrolFuelVolume called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const fullUrl = `/api/dashboard/petrol-data/fuel-volume?${params}`;
    const response = await fetchAPI(fullUrl);
    const data = response?.data ?? response;
    const totalFuelVolume = data?.totalFuelVolume ?? 0;
    const source = data?.source ?? 'unknown';
    console.log('⛽ [Frontend] getPetrolFuelVolume → totalFuelVolume:', totalFuelVolume, 'source:', source, 'raw:', data);
    return data;
  },

  /**
   * Get fuel volume breakdown by nominal code for specific date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolFuelVolumeBreakdown: async (startDate, endDate) => {
    console.log('⛽ [Frontend] getPetrolFuelVolumeBreakdown called', { startDate, endDate });
    
    const params = new URLSearchParams({
      startDate: startDate,
      endDate: endDate
    });
    
    const fullUrl = `/api/dashboard/petrol-data/fuel-volume-breakdown?${params}`;
    console.log('⛽ [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('⛽ [Frontend] getPetrolFuelVolumeBreakdown response:', response);
    return response.data;
  },

  /**
   * Get fuel volume breakdown from transaction details (e.g. Sax-Keyfuel-Nov'25-17.11.25-23.11.25/5712.23 | ...).
   * Returns volume in litres by label (site + period); does not affect site revenue metrics.
   */
  getPetrolFuelVolumeTransitionBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/fuel-volume-transition-breakdown?${params}`);
    const data = response?.data ?? response;
    return data;
  },

  /**
   * Get fuel volume breakdown by site (for "Fuel Volume by Site" modal)
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolFuelVolumeBySite: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/fuel-volume-by-site?${params}`);
    return response.data;
  },

  /**
   * Get fuel volume breakdown by nominal code (4000 Petrol, 4001 Diesel, etc.) – volume from details, add/subtract.
   */
  getPetrolFuelVolumeByNominal: async (startDate, endDate, siteIds) => {
    console.log('⛽ [Frontend] getPetrolFuelVolumeByNominal called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/fuel-volume-by-nominal?${params}`);
    const data = response?.data ?? response;
    const breakdown = data?.breakdown ?? [];
    const totalVolume = data?.totalVolume ?? 0;
    const four001 = breakdown.find(b => b?.code === '4001');
    console.log('⛽ [Frontend] getPetrolFuelVolumeByNominal → totalVolume:', totalVolume, '4001 Diesel:', four001?.volume, 'breakdown:', breakdown);
    return data;
  },

  /**
   * Get fuel volume breakdown by fuel grade (Petrol, Diesel, Super Petrol, Super Diesel, AdBlue)
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolFuelGradeBreakdown: async (startDate, endDate, siteIds) => {
    console.log('⛽ [Frontend] getPetrolFuelGradeBreakdown called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const fullUrl = `/api/dashboard/petrol-data/fuel-grade-breakdown?${params}`;
    console.log('⛽ [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('⛽ [Frontend] getPetrolFuelGradeBreakdown response:', response);
    return response.data;
  },

  /**
   * Get net sales for specific nominal codes filtered by date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolNetSales: async (startDate, endDate, siteIds) => {
    console.log('💰 [Frontend] getPetrolNetSales called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const fullUrl = `/api/dashboard/petrol-data/net-sales?${params}`;
    console.log('💰 [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('💰 [Frontend] getPetrolNetSales response:', response);
    return response.data;
  },

  /**
   * Get net sales breakdown by nominal code for specific date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolNetSalesBreakdown: async (startDate, endDate, siteIds) => {
    console.log('💰 [Frontend] getPetrolNetSalesBreakdown called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const fullUrl = `/api/dashboard/petrol-data/net-sales-breakdown?${params}`;
    console.log('💰 [Frontend] Full API URL:', fullUrl);
    const response = await fetchAPI(fullUrl);
    console.log('💰 [Frontend] getPetrolNetSalesBreakdown response:', response);
    return response.data;
  },

  /**
   * Get fuel sales (£) by site for all 29 sites (for Total Site Revenue breakdown modal)
   */
  getPetrolFuelSalesBySite: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchAPI(`/api/dashboard/petrol-data/fuel-sales-by-site?${params}`);
    return response.data;
  },

  /**
   * Get profit (Fuel Profit + Other Income) for specific date range
   */
  getPetrolProfit: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/profit?${params}`);
    return response.data;
  },

  /**
   * Get profit breakdown for specific date range
   */
  getPetrolProfitBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/profit-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get ROI (Net Profit / Investment × 100) for date range. Net Profit = 82 N/Cs, Investment = 15 N/Cs.
   */
  getPetrolROI: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/roi?${params}`);
    return response.data;
  },

  /**
   * Get ROI by month for trend chart (Net Profit / Investment × 100 per month).
   */
  getPetrolROIMonthlyTrend: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/roi-monthly-trend?${params}`);
    return response.data;
  },

  /**
   * Get EBITA (sum of 69 N/Cs, raw amounts — negative signs preserved).
   */
  getPetrolEBITA: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/ebita?${params}`);
    return response.data;
  },

  /**
   * Get average profit per liter for specific date range
   */
  getPetrolAvgPPL: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/avg-ppl?${params}`);
    return response.data;
  },

  /**
   * Get actual PPL (PPL after overheads) for specific date range. Optional siteIds for per-site.
   */
  getPetrolActualPPL: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/actual-ppl?${params}`);
    return response.data;
  },

  /**
   * Get actual PPL breakdown (overhead categories) for specific date range
   */
  getPetrolActualPPLBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/actual-ppl-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get monthly overhead cost trends (Labour, Utilities, Maintenance, Other) for charts
   */
  getPetrolOverheadTrends: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchAPI(`/api/dashboard/petrol-data/overhead-trends?${params}`);
    return response.data;
  },

  /**
   * Get labour cost for specific date range
   */
  getPetrolLabourCost: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/labour-cost?${params}`);
    return response.data;
  },

  /**
   * Get labour cost breakdown for specific date range
   */
  getPetrolLabourCostBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/labour-cost-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get active sites count for specific date range
   */
  getPetrolActiveSites: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchAPI(`/api/dashboard/petrol-data/active-sites?${params}`);
    return response.data;
  },

  /**
   * Get profit margin percentage for specific date range
   */
  getPetrolProfitMargin: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/profit-margin?${params}`);
    return response.data;
  },

  /**
   * Get average sale per site for specific date range
   */
  getPetrolAvgSalePerSite: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/avg-sale-per-site?${params}`);
    return response.data;
  },

  /**
   * Get total purchases for specific date range
   */
  getPetrolTotalPurchases: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchAPI(`/api/dashboard/petrol-data/total-purchases?${params}`);
    return response.data;
  },

  /**
   * Get total purchases breakdown for specific date range
   */
  getPetrolTotalPurchasesBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/total-purchases-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get bank closing balance (only needs endDate)
   */
  getPetrolBankBalance: async (endDate, siteIds) => {
    const params = new URLSearchParams({ endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/bank-balance?${params}`);
    return response.data;
  },

  /**
   * Get bank balance breakdown (only needs endDate)
   */
  getPetrolBankBalanceBreakdown: async (endDate, siteIds) => {
    const params = new URLSearchParams({ endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/bank-balance-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get bunkered breakdown (Volume, Sales, Profit)
   */
  getPetrolBunkeredBreakdown: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchAPI(`/api/dashboard/petrol-data/bunkered-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get non-bunkered breakdown (Volume, Sales, Profit)
   */
  getPetrolNonBunkeredBreakdown: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/non-bunkered-breakdown?${params}`);
    return response.data;
  },

  /**
   * Get other income summary (total only for card display)
   */
  getPetrolOtherIncomeSummary: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/other-income-summary?${params}`);
    return response.data;
  },

  /**
   * Get monthly fuel performance trends across all sites
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolMonthlyTrends: async (startDate, endDate, siteIds) => {
    console.log('📊 [Frontend] getPetrolMonthlyTrends called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/monthly-trends?${params}`);
    console.log('📊 [Frontend] getPetrolMonthlyTrends response:', response);
    return response.data;
  },

  /**
   * Get daily/date-wise data across all sites
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolDailyData: async (startDate, endDate, siteIds) => {
    console.log('📅 [Frontend] getPetrolDailyData called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/daily-data?${params}`);
    console.log('📅 [Frontend] getPetrolDailyData response:', response);
    return response.data;
  },

  /**
   * Get PPL comparison (Avg PPL vs Actual PPL) across all sites
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolPPLComparison: async (startDate, endDate, siteIds) => {
    console.log('📊 [Frontend] getPetrolPPLComparison called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/ppl-comparison?${params}`);
    console.log('📊 [Frontend] getPetrolPPLComparison response:', response);
    return response.data;
  },

  /**
   * Get profit distribution by site (top 10) across all sites
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolProfitBySite: async (startDate, endDate, siteIds) => {
    console.log('💰 [Frontend] getPetrolProfitBySite called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/profit-by-site?${params}`);
    console.log('💰 [Frontend] getPetrolProfitBySite response:', response);
    return response.data;
  },

  /**
   * Get site rankings (top 5 and bottom 5) by net sales
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  getPetrolSiteRankings: async (startDate, endDate, siteIds) => {
    console.log('📊 [Frontend] getPetrolSiteRankings called', { startDate, endDate, siteIds });
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/site-rankings?${params}`);
    console.log('📊 [Frontend] getPetrolSiteRankings response:', response);
    return response.data;
  },
};

/**
 * Health check
 */
export const healthCheck = async () => {
  return fetchAPI('/health');
};

export default {
  sites: sitesAPI,
  dashboard: dashboardAPI,
  healthCheck,
};

