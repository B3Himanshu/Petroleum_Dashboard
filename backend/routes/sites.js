import express from 'express';
import { query } from '../config/database.js';
import { mapSiteToFrontend, getCityFromPostcode } from '../utils/cityMapping.js';

const router = express.Router();

// Fallback for all 29 sites when DB sites table is missing or has different schema (e.g. Sage-only DB).
// Ensures map and tables get site_code, site_name, post_code so city/location can be derived.
const SITE_FALLBACK = [
  { site_code: 6, site_name: 'Manor Service Station', post_code: 'SO18 1AR' },
  { site_code: 7, site_name: 'Hen And Chicken SS', post_code: 'GU34 4JH' },
  { site_code: 9, site_name: 'Salterton Road SS', post_code: 'EX8 2NE' },
  { site_code: 10, site_name: 'Lanner Moor Garage', post_code: 'TR16 6HT' },
  { site_code: 11, site_name: 'Luton Road SS', post_code: 'LU5 4LW' },
  { site_code: 14, site_name: 'Kings Lane SS', post_code: 'PE19 1JZ' },
  { site_code: 17, site_name: 'Delph SS', post_code: 'PE7 1RO' },
  { site_code: 18, site_name: 'Saxon Autopoint SS', post_code: 'PE7 1NJ' },
  { site_code: 19, site_name: 'Jubits Lane SS', post_code: 'WA9 4RX' },
  { site_code: 20, site_name: 'Worsley Brow', post_code: 'WA9 3EZ' },
  { site_code: 23, site_name: 'Auto Pitstop', post_code: 'PE13 4AA' },
  { site_code: 24, site_name: 'Crown SS', post_code: 'HD6 1QH' },
  { site_code: 25, site_name: 'Marsland SS', post_code: 'OL8 1SY' },
  { site_code: 29, site_name: 'Gemini SS', post_code: 'WA5 7TY' },
  { site_code: 30, site_name: 'Park View', post_code: 'DE45 1AW' },
  { site_code: 31, site_name: 'Filleybrook SS', post_code: 'ST15 0PT' },
  { site_code: 33, site_name: 'Swan Connect', post_code: 'B70 0YA' },
  { site_code: 34, site_name: 'Portland', post_code: 'DT5 1BW' },
  { site_code: 35, site_name: 'Lower Lane', post_code: 'GL16 8QQ' },
  { site_code: 36, site_name: 'Vale SS', post_code: 'WR11 7QP' },
  { site_code: 37, site_name: 'Kensington SS', post_code: 'B29 7NY' },
  { site_code: 38, site_name: 'County Oak SS', post_code: 'RH10 9TA' },
  { site_code: 39, site_name: 'Kings Of Sedgley', post_code: 'DY3 1RA' },
  { site_code: 40, site_name: 'Gnosall SS', post_code: 'ST20 0EZ' },
  { site_code: 41, site_name: 'Minsterley SS', post_code: 'SY5 0BE' },
  { site_code: 42, site_name: 'Nelson SS', post_code: 'BB9 7AJ' },
  { site_code: 43, site_name: 'Yeovil SS', post_code: 'BA21 4EH' },
  { site_code: 44, site_name: 'Canklow SS', post_code: 'S60 2XG' },
  { site_code: 45, site_name: 'Stanton Self Service', post_code: 'IP31 2BZ' },
];

/**
 * GET /api/sites
 * Get all sites
 */
router.get('/', async (req, res) => {
  try {
    console.log('🏢 [Backend] GET /api/sites');
    console.log('🏢 [Backend] Query params:', req.query);
    
    // Get sites from database - minimal schema (site_code, site_name, post_code) for compatibility with Sage DB
    // Filter out sites with site_code 0 or 1 (header/company rows)
    const sitesQuery = `
      SELECT site_code, site_name, post_code
      FROM sites
      WHERE site_code > 1
        AND (post_code IS NOT NULL AND post_code != '')
        AND (site_name IS NOT NULL AND site_name != '')
      ORDER BY site_code;
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
        SELECT site_code, site_name, post_code FROM sites WHERE site_code > 1 ORDER BY site_code;
      `);
      const mappedSites = result.rows.map(mapSiteToFrontend);
      return res.json({ success: true, count: mappedSites.length, data: mappedSites });
    }
    const result = await query(`
      SELECT site_code, site_name, post_code FROM sites
      WHERE site_code > 1 AND post_code IS NOT NULL AND post_code != '' AND site_name IS NOT NULL AND site_name != ''
      ORDER BY site_code;
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
      SELECT DISTINCT post_code FROM sites WHERE site_code > 1 AND post_code IS NOT NULL AND post_code != '' ORDER BY post_code;
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
      'SELECT site_code, site_name, post_code FROM sites WHERE site_code = $1;',
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

