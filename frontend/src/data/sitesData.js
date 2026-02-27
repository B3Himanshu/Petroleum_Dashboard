/**
 * @deprecated This file is deprecated. All data now comes from the backend API.
 * Use sitesAPI from @/services/api instead.
 * 
 * This file is kept for reference only and may be removed in a future version.
 */

// Sites data extracted from post codes
// City names are derived from UK postcode areas

export const sitesData = [
  { id: 1, name: "Manor Service Station", postCode: "SO18 1AR", city: "southampton", cityDisplay: "Southampton" },
  { id: 2, name: "Hen And Chicken S_Stn", postCode: "GU34 4JH", city: "guildford", cityDisplay: "Guildford" },
  { id: 3, name: "Salterton Road Service Station", postCode: "EX8 2NE", city: "exmouth", cityDisplay: "Exmouth" },
  { id: 4, name: "Lanner Moor Garage", postCode: "TR16 6HT", city: "truro", cityDisplay: "Truro" },
  { id: 5, name: "Luton Road Service Station", postCode: "LU5 4LW", city: "luton", cityDisplay: "Luton" },
  { id: 6, name: "Kings Lane Service Station", postCode: "PE19 1JZ", city: "peterborough", cityDisplay: "Peterborough" },
  { id: 7, name: "Delph Service Station", postCode: "PE7 1RQ", city: "peterborough", cityDisplay: "Peterborough" },
  { id: 8, name: "Saxon Autopoint Ss", postCode: "PE7 1NJ", city: "peterborough", cityDisplay: "Peterborough" },
  { id: 9, name: "Jubits Lane Sstn", postCode: "WA9 4RX", city: "warrington", cityDisplay: "Warrington" },
  { id: 10, name: "Worsley Brow", postCode: "WA9 3EZ", city: "warrington", cityDisplay: "Warrington" },
  { id: 11, name: "Auto Pitstop", postCode: "PE13 4AA", city: "wisbech", cityDisplay: "Wisbech" },
  { id: 12, name: "Crown Service Station", postCode: "HD6 1QH", city: "huddersfield", cityDisplay: "Huddersfield" },
  { id: 13, name: "Marsland Service Station", postCode: "OL8 1SY", city: "oldham", cityDisplay: "Oldham" },
  { id: 14, name: "Gemini Service Station", postCode: "WA5 7TY", city: "warrington", cityDisplay: "Warrington" },
  { id: 15, name: "Park View", postCode: "DE45 1AW", city: "matlock", cityDisplay: "Matlock" },
  { id: 16, name: "Filleybrook S_Stn", postCode: "ST15 0PT", city: "stafford", cityDisplay: "Stafford" },
  { id: 17, name: "Swan Connect", postCode: "B70 0YA", city: "birmingham", cityDisplay: "Birmingham" },
  { id: 18, name: "Portland", postCode: "DT5 1BW", city: "weymouth", cityDisplay: "Weymouth" },
  { id: 19, name: "Lower Lane", postCode: "GL16 8QQ", city: "lydney", cityDisplay: "Lydney" },
  { id: 20, name: "Vale Service Station", postCode: "WR11 7QP", city: "evesham", cityDisplay: "Evesham" },
  { id: 21, name: "Kensington Service Station", postCode: "B29 7NY", city: "birmingham", cityDisplay: "Birmingham" },
  { id: 22, name: "County Oak Service Station", postCode: "RH10 9TA", city: "crawley", cityDisplay: "Crawley" },
  { id: 23, name: "Kings Of Sedgley", postCode: "DY3 1RA", city: "dudley", cityDisplay: "Dudley" },
  { id: 24, name: "Gnosall Service Station", postCode: "ST20 0EZ", city: "stafford", cityDisplay: "Stafford" },
  { id: 25, name: "Minsterley Service Station", postCode: "SY5 0BE", city: "shrewsbury", cityDisplay: "Shrewsbury" },
  { id: 26, name: "Nelson Service Station", postCode: "BB9 7AJ", city: "burnley", cityDisplay: "Burnley" },
  { id: 27, name: "Yeovil Service Satation", postCode: "BA21 4EH", city: "yeovil", cityDisplay: "Yeovil" },
  { id: 28, name: "Canklow Service Station", postCode: "S60 2XG", city: "rotherham", cityDisplay: "Rotherham" },
  { id: 29, name: "Stanton Self Serve", postCode: "IP31 2BZ", city: "bury-st-edmunds", cityDisplay: "Bury St Edmunds" },
];

// Create a Map for O(1) site lookups by ID - optimized for performance
const sitesByIdMap = new Map(sitesData.map(site => [site.id, site]));

// Get unique cities from sites data
export const getUniqueCities = () => {
  const cityMap = new Map();
  sitesData.forEach(site => {
    if (!cityMap.has(site.city)) {
      cityMap.set(site.city, {
        id: site.city,
        displayName: site.cityDisplay,
      });
    }
  });
  return Array.from(cityMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
};

// Get sites for a specific city
export const getSitesByCity = (cityId) => {
  if (!cityId || cityId === 'all') {
    return sitesData;
  }
  return sitesData.filter(site => site.city === cityId);
};

// Get site by ID - optimized with Map for O(1) lookup instead of O(n) Array.find
export const getSiteById = (siteId) => {
  const id = parseInt(siteId, 10);
  return sitesByIdMap.get(id) || null;
};

