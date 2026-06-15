/**
 * Approximate WGS84 coordinates for HSRL forecourts (Site Comparison / map imagery).
 * Refine per site for pin accuracy; Static Maps + Street View use these centers.
 */
export const SITE_GEO_BY_ID = {
  1: { lat: 52.487, lng: -1.894 }, // ANSON SS (Birmingham area)
  2: { lat: 52.637, lng: -1.14 }, // BELGRAVE SS (Leicester)
  4: { lat: 52.575, lng: -1.575 }, // BADDESLEY SS
  5: { lat: 51.395, lng: 0.169 }, // SWANLEY SS
  6: { lat: 52.214, lng: -0.315 }, // ASTWICK SS
  7: { lat: 51.59, lng: -0.102 }, // VINEYARD SS — verify
  8: { lat: 51.548, lng: -0.568 }, // WEXHAM SS
  9: { lat: 52.458, lng: -2.109 }, // LYE SS
  10: { lat: 52.235, lng: 0.082 }, // GIRTON SS
  11: { lat: 50.864, lng: -0.151 }, // PATCHAM SS
  13: { lat: 51.527, lng: -0.262 }, // PARK ROYAL SS
  14: { lat: 51.442, lng: 0.371 }, // Gravesend SS
  15: { lat: 51.675, lng: -0.607 }, // Amersham SS
  18: { lat: 51.481, lng: 0.175 }, // ERITH SS
};

export function getSiteGeo(siteId) {
  const id = Number(siteId);
  if (Number.isNaN(id)) return null;
  return SITE_GEO_BY_ID[id] ?? null;
}

/** @param {{ lat: number, lng: number }} geo */
export function buildGoogleMapsEmbedUrl(geo, zoom = 17) {
  if (!geo) return null;
  return `https://www.google.com/maps?q=${geo.lat},${geo.lng}&z=${zoom}&output=embed`;
}

/**
 * Satellite static map (requires Maps Static API enabled on the key).
 * @param {{ lat: number, lng: number }} geo
 */
export function buildGoogleStaticMapUrl(geo, apiKey, options = {}) {
  if (!geo || !apiKey) return null;
  const {
    zoom = 17,
    size = "640x360",
    maptype = "satellite",
    scale = "2",
  } = options;
  const params = new URLSearchParams({
    center: `${geo.lat},${geo.lng}`,
    zoom: String(zoom),
    size,
    maptype,
    scale,
    markers: `color:red|${geo.lat},${geo.lng}`,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Road map variant (second thumbnail). */
export function buildGoogleStaticRoadMapUrl(geo, apiKey) {
  return buildGoogleStaticMapUrl(geo, apiKey, { maptype: "roadmap", zoom: 16 });
}

/**
 * Street View panorama thumbnail (no coverage → image may be gray; handle onError).
 */
export function buildGoogleStreetViewUrl(geo, apiKey, options = {}) {
  if (!geo || !apiKey) return null;
  const { size = "640x360", fov = "75", pitch = "0" } = options;
  const params = new URLSearchParams({
    size,
    location: `${geo.lat},${geo.lng}`,
    fov,
    pitch,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
