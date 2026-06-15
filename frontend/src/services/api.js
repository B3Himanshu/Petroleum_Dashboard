/**
 * API Service
 * Handles all backend API communication
 */

import { ALL_HSRL_SITES } from '@/constants/sites';

// Backend default port is 2000 (server.js).
// In dev: leave VITE_API_URL unset → use same-origin "/api" + Vite proxy (works with Cloudflare tunnel on phone).
// Set VITE_API_URL only if the API is on another host (e.g. PORT=3001 or production build).
const _viteApi = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
const API_BASE_URL = _viteApi || '';

/** localStorage keys for JWT (user vs admin sessions) */
export const USER_TOKEN_KEY = 'hsrl_jwt_user';
export const ADMIN_TOKEN_KEY = 'hsrl_jwt_admin';

/**
 * Generic fetch wrapper with error handling.
 * @param {string} endpoint
 * @param {RequestInit & { authRole?: 'user' | 'admin' | 'none' }} options - authRole defaults to 'user' (sends user JWT)
 */
const fetchAPI = async (endpoint, options = {}) => {
  try {
    const { authRole = 'user', ...fetchOpts } = options;
    const authHeaders = {};
    if (authRole === 'user') {
      const userT = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_TOKEN_KEY) : null;
      const adminT = typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const t = userT || adminT;
      if (t) authHeaders.Authorization = `Bearer ${t}`;
    } else if (authRole === 'admin') {
      const t = typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      if (t) authHeaders.Authorization = `Bearer ${t}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...fetchOpts.headers,
      },
      ...fetchOpts,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    let data = null;
    if (isJson) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    // Treat both HTTP failure and { success: false } payloads as errors so callers handle them uniformly.
    const isPayloadFailure = data && typeof data === 'object' && data.success === false && (data.error || data.message);
    if (!response.ok || isPayloadFailure) {
      const msg =
        data?.message ||
        data?.error ||
        (response.status === 401 ? 'Invalid email or password' : null) ||
        `API Error: ${response.status}`;
      const err = new Error(typeof msg === 'string' ? msg : response.statusText);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Public auth (no JWT)
 */
export const authAPI = {
  /** Public: how many dashboard_users rows exist (for login help text) */
  status: () => fetchAPI('/api/auth/status', { method: 'GET', authRole: 'none' }),
  login: (email, password) =>
    fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      authRole: 'none',
    }),
  verifyEmailGet: (token) =>
    fetch(`${API_BASE_URL || ''}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json' },
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || data.error || r.statusText);
      return data;
    }),
  forgotPassword: (email) =>
    fetchAPI('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      authRole: 'none',
    }),
  resetPassword: (token, newPassword) =>
    fetchAPI('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
      authRole: 'none',
    }),
};

export const adminAuthAPI = {
  login: (username, password) =>
    fetchAPI('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      authRole: 'none',
    }),
  listUsers: () => fetchAPI('/api/admin/users', { method: 'GET', authRole: 'admin' }),
  createUser: (email, password, firstName, lastName, verificationMode) =>
    fetchAPI('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName, verificationMode }),
      authRole: 'admin',
    }),
  deleteUser: (id) =>
    fetchAPI(`/api/admin/users/${id}`, { method: 'DELETE', authRole: 'admin' }),
  resendVerification: (id) =>
    fetchAPI(`/api/admin/users/${id}/resend-verification`, { method: 'POST', authRole: 'admin' }),
  /** Mark user verified without email link (admin only) */
  verifyUser: (id) =>
    fetchAPI(`/api/admin/users/${id}/verify`, { method: 'POST', authRole: 'admin' }),
  /** Update a user's password (admin only) */
  updateUserPassword: (id, password) =>
    fetchAPI(`/api/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
      authRole: 'admin',
    }),
};

/** User profile API */
export const profileAPI = {
  getMe: () => fetchAPI('/api/auth/me', { method: 'GET', authRole: 'user' }),
  update: (firstName, lastName) =>
    fetchAPI('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ firstName, lastName }),
      authRole: 'user',
    }),
};

/** Admin profile API */
export const adminProfileAPI = {
  getMe: () => fetchAPI('/api/admin/profile', { method: 'GET', authRole: 'admin' }),
  update: (firstName, lastName, username) =>
    fetchAPI('/api/admin/profile', {
      method: 'PATCH',
      body: JSON.stringify({ firstName, lastName, username }),
      authRole: 'admin',
    }),
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

// When a strict subset of dept IDs is selected, add siteIds; when all departments or none, omit (backend = all sites).
const HSRL_DEPT_COUNT = ALL_HSRL_SITES.length;

function appendSiteIdsToParams(params, siteIds) {
  const ids = Array.isArray(siteIds) ? siteIds : (siteIds != null ? [siteIds] : []);
  if (ids.length > 0 && ids.length < HSRL_DEPT_COUNT) {
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

  /** Metrics Comparison page: all site rows in one request (same maths as separate petrol-data calls). */
  getMetricsComparisonSites: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/metrics-comparison-sites?${params}`);
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
   * Get fuel sales (£) by site for all HSRL departments (for Total Site Revenue breakdown modal)
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
   * ROI = Total Net Profit (same as /total-net-profit, respects siteIds) ÷ cumulative Investment × 100.
   * Investment = company-wide: those N/Cs across all departments, cumulative from earliest DB posting through endDate.
   */
  getPetrolROI: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/roi?${params}`);
    return response.data;
  },

  /**
   * Monthly trend: { months, bySite }. P&L/ROI aggregate + per selected site; cumulative investment company-wide.
   * Uses the requested start/end (no May clamp).
   */
  getPetrolROIMonthlyTrend: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/roi-monthly-trend?${params}`);
    return response.data;
  },

  /**
   * Get EBITDA metric from /ebita (gross profit + misc − overheads excl. depreciation & loan interest).
   */
  getPetrolEBITA: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/ebita?${params}`);
    return response.data;
  },

  /**
   * Total Net Profit = EBITDA − Depreciation − Loan Interest (7750,7705,7752,7753; 7751 excluded) − Corporation Tax (9000)
   */
  getPetrolTotalNetProfit: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/total-net-profit?${params}`);
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
   * Get wages for Overhead Cost Breakdown card (N/C 7000-7003, 7005-7008, 7010)
   */
  getPetrolWagesForOverheads: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/wages-for-overheads?${params}`);
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
   * Get shop profit: Sales (4032,4034,4036,4037,4039,5035) − Cost (5032–5034,5036,5037,5039,5042)
   */
  getPetrolShopProfit: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/shop-profit?${params}`);
    return response.data;
  },

  /**
   * Get valet profit: Sales (4028,4029,4030,4031,4017) − Cost (5028,5029,5030,5031)
   */
  getPetrolValetProfit: async (startDate, endDate, siteIds) => {
    const params = new URLSearchParams({ startDate, endDate });
    appendSiteIdsToParams(params, siteIds);
    const response = await fetchAPI(`/api/dashboard/petrol-data/valet-profit?${params}`);
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
   * Get PPL comparison (Gross PPL and overhead pence/litre; chart shows Gross PPL and PPL after O/H) across all sites
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

