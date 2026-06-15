import express from 'express';
import { query } from '../config/database.js';
import { mapSiteToFrontend, getCityFromPostcode } from '../utils/cityMapping.js';

const router = express.Router();

// HSRL 20 departments (0-19) fallback
const SITE_FALLBACK = [
  { site_code: 0, site_name: 'HEAD OFFICE', post_code: '' },
  { site_code: 1, site_name: 'ANSON SS', post_code: '' },
  { site_code: 2, site_name: 'BELGRAVE SS', post_code: '' },
  { site_code: 3, site_name: 'GREENFORD PARK SS', post_code: '' },
  { site_code: 4, site_name: 'BADDESLEY SS', post_code: '' },
  { site_code: 5, site_name: 'SWANLEY SS', post_code: '' },
  { site_code: 6, site_name: 'ASTWICK SS', post_code: '' },
  { site_code: 7, site_name: 'VINEYARD SS', post_code: '' },
  { site_code: 8, site_name: 'WEXHAM SS', post_code: '' },
  { site_code: 9, site_name: 'LYE SS', post_code: '' },
  { site_code: 10, site_name: 'GIRTON SS', post_code: '' },
  { site_code: 11, site_name: 'PATCHAM SS', post_code: '' },
  { site_code: 12, site_name: 'SUBWAY', post_code: '' },
  { site_code: 13, site_name: 'PARK ROYAL SS', post_code: '' },
  { site_code: 14, site_name: 'Gravesend SS', post_code: '' },
  { site_code: 15, site_name: 'Amersham SS', post_code: '' },
  { site_code: 16, site_name: 'Oakham SS', post_code: '' },
  { site_code: 17, site_name: 'Spalding SS', post_code: '' },
  { site_code: 18, site_name: 'ERITH SS', post_code: '' },
  { site_code: 19, site_name: 'Erith Subway', post_code: '' },
];

/**
 * GET /api/sites
 * Get all sites
 */
router.get('/', async (req, res) => {
  try {
    console.log('🏢 [Backend] GET /api/sites');
    console.log('🏢 [Backend] Query params:', req.query);
    
    const sitesQuery = `
      SELECT dept_number::int AS site_code, dept_name AS site_name, '' AS post_code
      FROM HSRL_departments
      ORDER BY dept_number::int;
    `;
    console.log('🏢 [Backend] Executing sites query');
    const result = await query(sitesQuery);
    console.log('🏢 [Backend] Sites query result:', {
      rowCount: result.rows.length,
      sampleSites: result.rows.slice(0, 3).map(r => ({ code: r.site_code, name: r.site_name }))
    });
    
    // Map database format to frontend format
    const mappedSites = result.rows.map(mapSiteToFrontend);
    console.log('🏢 [Backend] Mapped sites:', {
      totalCount: mappedSites.length,
      sampleMapped: mappedSites.slice(0, 3)
    });
    
    res.json({
      success: true,
      count: mappedSites.length,
      data: mappedSites
    });
  } catch (error) {
    console.warn('⚠️ [Backend] Sites table unavailable, using fallback:', error.message);
    const mappedSites = SITE_FALLBACK.map(mapSiteToFrontend);
    return res.json({
      success: true,
      count: mappedSites.length,
      data: mappedSites
    });
  }
});

/**
 * GET /api/sites/city/:cityId
 * Get all sites for a specific city (must be before /:id)
 */
router.get('/city/:cityId', async (req, res) => {
  const { cityId } = req.params;
  try {
    if (cityId === 'all') {
      const result = await query(`
        SELECT dept_number::int AS site_code, dept_name AS site_name, '' AS post_code FROM HSRL_departments ORDER BY dept_number::int;
      `);
      const mappedSites = result.rows.map(mapSiteToFrontend);
      return res.json({ success: true, count: mappedSites.length, data: mappedSites });
    }
    const result = await query(`
      SELECT dept_number::int AS site_code, dept_name AS site_name, '' AS post_code FROM HSRL_departments ORDER BY dept_number::int;
    `);
    const mappedSites = result.rows.map(mapSiteToFrontend).filter(site => site.city === cityId);
    return res.json({ success: true, count: mappedSites.length, data: mappedSites });
  } catch (error) {
    const mapped = SITE_FALLBACK.map(mapSiteToFrontend);
    const data = cityId === 'all' ? mapped : mapped.filter(site => site.city === cityId);
    return res.json({ success: true, count: data.length, data });
  }
});

/**
 * GET /api/sites/cities/list
 * Get list of unique cities (derived from postcodes). Must be before /:id.
 */
router.get('/cities/list', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT '' AS post_code FROM HSRL_departments;
    `);
    const cityMap = new Map();
    result.rows.forEach(row => {
      const cityInfo = getCityFromPostcode(row.post_code);
      if (cityInfo && !cityMap.has(cityInfo.city)) {
        cityMap.set(cityInfo.city, { id: cityInfo.city, displayName: cityInfo.cityDisplay });
      }
    });
    const cities = Array.from(cityMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return res.json({ success: true, count: cities.length, data: cities });
  } catch (error) {
    const cityMap = new Map();
    SITE_FALLBACK.forEach(row => {
      const cityInfo = getCityFromPostcode(row.post_code);
      if (cityInfo && !cityMap.has(cityInfo.city)) {
        cityMap.set(cityInfo.city, { id: cityInfo.city, displayName: cityInfo.cityDisplay });
      }
    });
    const cities = Array.from(cityMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return res.json({ success: true, count: cities.length, data: cities });
  }
});

/**
 * GET /api/sites/:id
 * Get site by ID (site_code). Uses fallback with site_code + post_code so map can show location when DB fails.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const siteCode = parseInt(id, 10);
  if (isNaN(siteCode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid site ID'
    });
  }

  try {
    const result = await query(
      'SELECT dept_number::int AS site_code, dept_name AS site_name, \'\' AS post_code FROM HSRL_departments WHERE dept_number::int = $1;',
      [siteCode]
    );
    if (result.rows.length > 0) {
      const mappedSite = mapSiteToFrontend(result.rows[0]);
      return res.json({ success: true, data: mappedSite });
    }
  } catch (error) {
    console.warn('⚠️ [Backend] Site by ID from DB failed, using fallback:', error.message);
  }

  const fallback = SITE_FALLBACK.find(s => s.site_code === siteCode);
  if (fallback) {
    const mappedSite = mapSiteToFrontend(fallback);
    return res.json({ success: true, data: mappedSite });
  }
  return res.status(404).json({
    success: false,
    message: 'Site not found'
  });
});

export default router;

