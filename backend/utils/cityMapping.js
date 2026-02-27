/**
 * City mapping utility
 * Maps UK postcodes to cities based on postcode area codes
 */

// Postcode area to city mapping
const postcodeToCity = {
  // Southampton area
  'SO': { city: 'southampton', cityDisplay: 'Southampton' },
  // Guildford area
  'GU': { city: 'guildford', cityDisplay: 'Guildford' },
  // Exmouth area
  'EX': { city: 'exmouth', cityDisplay: 'Exmouth' },
  // Truro area
  'TR': { city: 'truro', cityDisplay: 'Truro' },
  // Luton area
  'LU': { city: 'luton', cityDisplay: 'Luton' },
  // Peterborough area
  'PE': { city: 'peterborough', cityDisplay: 'Peterborough' },
  // Warrington area
  'WA': { city: 'warrington', cityDisplay: 'Warrington' },
  // Huddersfield area
  'HD': { city: 'huddersfield', cityDisplay: 'Huddersfield' },
  // Oldham area
  'OL': { city: 'oldham', cityDisplay: 'Oldham' },
  // Matlock area
  'DE': { city: 'matlock', cityDisplay: 'Matlock' },
  // Stafford area
  'ST': { city: 'stafford', cityDisplay: 'Stafford' },
  // Birmingham area
  'B': { city: 'birmingham', cityDisplay: 'Birmingham' },
  // Weymouth area
  'DT': { city: 'weymouth', cityDisplay: 'Weymouth' },
  // Lydney area (Gloucestershire)
  'GL': { city: 'lydney', cityDisplay: 'Lydney' },
  // Evesham area
  'WR': { city: 'evesham', cityDisplay: 'Evesham' },
  // Crawley area
  'RH': { city: 'crawley', cityDisplay: 'Crawley' },
  // Dudley area
  'DY': { city: 'dudley', cityDisplay: 'Dudley' },
  // Shrewsbury area
  'SY': { city: 'shrewsbury', cityDisplay: 'Shrewsbury' },
  // Burnley area
  'BB': { city: 'burnley', cityDisplay: 'Burnley' },
  // Yeovil area
  'BA': { city: 'yeovil', cityDisplay: 'Yeovil' },
  // Rotherham/Sheffield area
  'S': { city: 'rotherham', cityDisplay: 'Rotherham' },
  // Bury St Edmunds area
  'IP': { city: 'bury-st-edmunds', cityDisplay: 'Bury St Edmunds' },
  // Stockport area (SK)
  'SK': { city: 'rotherham', cityDisplay: 'Rotherham' },
  // Nottingham area (NG)
  'NG': { city: 'matlock', cityDisplay: 'Matlock' },
  // Torbay area (TQ)
  'TQ': { city: 'exmouth', cityDisplay: 'Exmouth' },
};

// Specific postcode mappings (for exceptions)
const specificPostcodeMapping = {
  'PE13': { city: 'wisbech', cityDisplay: 'Wisbech' },
  'PE19': { city: 'peterborough', cityDisplay: 'Peterborough' },
  'PE7': { city: 'peterborough', cityDisplay: 'Peterborough' },
  'PE18': { city: 'peterborough', cityDisplay: 'Peterborough' },
  'PE27': { city: 'peterborough', cityDisplay: 'Peterborough' },
};

/**
 * Extract city from postcode
 * @param {string} postcode - UK postcode (e.g., "SO18 1AR", "GU34 4JH")
 * @returns {Object} { city, cityDisplay } or null if not found
 */
export const getCityFromPostcode = (postcode) => {
  if (!postcode) return null;
  
  // Clean postcode (remove spaces, convert to uppercase)
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  
  // Check specific mappings first (e.g., PE13, PE19)
  const first4Chars = cleanPostcode.substring(0, 4);
  if (specificPostcodeMapping[first4Chars]) {
    return specificPostcodeMapping[first4Chars];
  }
  
  // Extract postcode area (first 1-2 letters)
  // Handle single letter areas (B) and double letter areas (SO, GU, etc.)
  let areaCode = '';
  if (cleanPostcode.length >= 2) {
    // Try 2-letter area first (SO, GU, etc.)
    const twoLetter = cleanPostcode.substring(0, 2);
    if (postcodeToCity[twoLetter]) {
      areaCode = twoLetter;
    } else {
      // Try 1-letter area (B, S)
      const oneLetter = cleanPostcode.substring(0, 1);
      if (postcodeToCity[oneLetter]) {
        areaCode = oneLetter;
      }
    }
  } else if (cleanPostcode.length >= 1) {
    // Try 1-letter area for short postcodes
    const oneLetter = cleanPostcode.substring(0, 1);
    if (postcodeToCity[oneLetter]) {
      areaCode = oneLetter;
    }
  }
  
  if (areaCode && postcodeToCity[areaCode]) {
    return postcodeToCity[areaCode];
  }
  
  // Default fallback
  return { city: 'unknown', cityDisplay: 'Unknown' };
};

/**
 * Map database site to frontend format
 * @param {Object} dbSite - Site from database { site_code, site_name, post_code, ... }
 * @returns {Object} Frontend format { id, name, postCode, city, cityDisplay }
 */
export const mapSiteToFrontend = (dbSite) => {
  const cityInfo = getCityFromPostcode(dbSite.post_code);
  
  return {
    id: dbSite.site_code,
    name: dbSite.site_name,
    postCode: dbSite.post_code,
    city: cityInfo?.city || 'unknown',
    cityDisplay: cityInfo?.cityDisplay || 'Unknown'
  };
};

