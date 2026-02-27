/**
 * Auto Pitstop site volume – output totals from sample details.
 * Run: node sitetest/auto-pitstop-volume.test.js
 */

// Same parsing as petrolDataSage: segments by | or ; or newline; each segment "label/volume"
function parseDetailsToVolumeSegments(details) {
  const out = [];
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash !== -1) {
      const label = trimmed.slice(0, lastSlash).trim();
      const afterSlash = trimmed.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.push({ label: label || 'Unknown', volume: num });
      }
    }
  }
  return out;
}

const DASH_LIKE = /[\u2013\u2014\u2212-]/;
function getSitePrefixFromLabel(label) {
  if (!label || typeof label !== 'string') return '';
  const s = label.trim();
  const idx = s.search(DASH_LIKE);
  return idx !== -1 ? s.slice(0, idx).trim() : s;
}

function isAutoPitstopSegment(label) {
  const prefix = getSitePrefixFromLabel(label);
  return prefix && prefix.toLowerCase().startsWith('auto');
}

// Sample details (May–Dec) – same format as user's DB
const SAMPLE_DETAILS = [
  "Auto Pitstop-Unleaded Sales-May'25/58780.28",
  "Auto Pitstop-Diesel Sales-May'25/255592.7",
  "Auto Pitstop-Super Unleaded Sales-May'25/19233.39",
  "Autokey Fuel Adblue for May'25/-481.59 | Auto Pitstop-Adblue Sales-May'25/2362.37 | Auto-Adblue Pumped-CHJ-Self bill Inv.-May'25/481.59",
  "Auto Pitstop-Unleaded Sales-June'25/58879.17",
  "Auto Pitstop-Diesel Sales-June'25/260746.93",
  "Auto Pitstop-Super Unleaded Sales-June'25/20345.29",
  "Auto-Adblue Pumped-CHJ-Self bill Inv.-Jun'25 | Auto keyfuel Adblue for Jun'25 | Auto Pitstop-Adblue Sales-June'25/2391.77",
  "Auto Pitstop-Unleaded Sales-July'25/47497.04",
  "Auto Pitstop-Diesel Sales-July'25/233633.87",
  "Auto Pitstop-Super Unleaded Sales-July'25/16978.69",
  "Auto-Adblue Pumped-CHJ-Self bill Inv.-Jul'25 | Auto-Key Fuel Adblue for Jul'25 | Auto Pitstop-Adblue Sales-July'25/2287.42",
  "Auto Pitstop-Unleaded Sales-Aug'25/52659.37",
  "Auto Pitstop-Diesel Sales-Aug'25/216403.13",
  "Auto Pitstop-Super Unleaded Sales-Aug'25/18006.77",
  "Auto Pitstop-Adblue Sales-Aug'25/2291.4 | Auto-Other Sale-CHJ-Self bill Inv.-Aug'25 | Auto Keyfuel Adblue Aug'25",
  "Auto Pitstop-Unleaded Sales-Sept'25/46568.75",
  "Auto Pitstop-Diesel Sales-Sept'25/235403.97",
  "Auto Pitstop-Super Unleaded Sales-Sept'25/15109.49",
  "Auto-Adblue Pump-CHJ-Self bill Inv.-Sep'25 | Auto-Key Fuel Adblue for Sep'25 | Auto Pitstop-Adblue Sales-Sept'25/2781.48",
  "Auto Pitstop-Unleaded Sales-Oct'25/56806.79",
  "Auto Pitstop-Diesel Sales-Oct'25/309580.82",
  "Auto Pitstop-Super Unleaded Sales-Oct'25/15437.52",
  "Auto-Key Fuel Adblue for Oct'25 | Auto-Adblue Pump-CHJ-Self bill Inv.-Oct'25/700.27 | Auto Pitstop-Adblue Sales-Oct'25/2483.37",
  "Auto Pitstop-Unleaded Sales-Nov'25/58134.83",
  "Auto Pitstop-Diesel Sales-Nov'25/303836.78",
  "Auto Pitstop-Super Unleaded Sales-Nov'25/16894.26",
  "Auto-Adblue Pump-CHJ-Self bill Inv.-Nov'25/870.84 | Auto Pitstop-Adblue Sales-Nov'25/2168.21 | Auto-Key Fuel Adblue for Nov'25/-870.84",
  "Auto Pitstop-Unleaded Sales-Dec'25/60142.24",
  "Auto Pitstop-Diesel Sales-Dec'25/256661.85",
  "Auto Pitstop-Super Unleaded Sales-Dec'25/17249.25",
  "Auto-Adblue Pump-CHJ-Self bill Inv.-Dec'25/697.17 | Auto Pitstop-Adblue Sales-Dec'25/2186.84 | Auto-Keyfuel Sales Petrol/-57.35 | Auto-Key Fuel Adblue for Dec'25/-639.82",
];

function run() {
  let totalNet = 0;
  let totalAddAll = 0;
  let autoPitstopAddAll = 0;
  let segmentCount = 0;
  let autoPitstopCount = 0;

  for (const details of SAMPLE_DETAILS) {
    const segments = parseDetailsToVolumeSegments(details);
    for (const { label, volume } of segments) {
      segmentCount++;
      totalNet += volume;
      totalAddAll += Math.abs(volume);
      if (isAutoPitstopSegment(label)) {
        autoPitstopCount++;
        autoPitstopAddAll += Math.abs(volume);
      }
    }
  }

  console.log('--- Auto Pitstop volume (from sample details) ---');
  console.log('Segments parsed:', segmentCount);
  console.log('Segments mapped to Auto Pitstop:', autoPitstopCount);
  console.log('Total volume (net, with sign):', totalNet.toFixed(2), 'L');
  console.log('Total volume (add all as positive):', totalAddAll.toFixed(2), 'L');
  console.log('Auto Pitstop volume (add all as positive):', autoPitstopAddAll.toFixed(2), 'L');
}

run();
