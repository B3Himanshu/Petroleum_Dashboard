/**
 * HSRL departments shown on the dashboard — fallback when API returns fewer or fails.
 * Closed sites (dept 3, 16, 17) are omitted. Matches backend dept_number → display name.
 */
export const ALL_HSRL_SITES = [
  { id: 0, name: 'HEAD OFFICE' },
  { id: 1, name: 'ANSON SS' },
  { id: 2, name: 'BELGRAVE SS' },
  { id: 4, name: 'BADDESLEY SS' },
  { id: 5, name: 'SWANLEY SS' },
  { id: 6, name: 'ASTWICK SS' },
  { id: 7, name: 'VINEYARD SS' },
  { id: 8, name: 'WEXHAM SS' },
  { id: 9, name: 'LYE SS' },
  { id: 10, name: 'GIRTON SS' },
  { id: 11, name: 'PATCHAM SS' },
  { id: 12, name: 'SUBWAY' },
  { id: 13, name: 'PARK ROYAL SS' },
  { id: 14, name: 'Gravesend SS' },
  { id: 15, name: 'Amersham SS' },
  { id: 18, name: 'ERITH SS' },
  { id: 19, name: 'Erith Subway' },
];

/** Closed depts — omitted from Business Performance dashboard site filter only (LatestPetrol). */
export const MAIN_DASHBOARD_EXCLUDED_DEPT_IDS = new Set([3, 16, 17]);

/** Main dashboard (LatestPetrol) site picker: active sites only, no closed 3 / 16 / 17. */
export const MAIN_DASHBOARD_SITES = ALL_HSRL_SITES.filter(
  (s) => !MAIN_DASHBOARD_EXCLUDED_DEPT_IDS.has(s.id)
);

/**
 * Excluded from Metrics Comparison & Site Comparison only (SUBWAY #12, Erith Subway #19).
 * Business Performance dashboard uses MAIN_DASHBOARD_SITES; other pages use ALL_HSRL_SITES as needed.
 */
export const COMPARISON_PAGES_EXCLUDED_DEPT_IDS = new Set([12, 19]);

/** Same site list as Metrics Comparison: no HEAD OFFICE (0), no COMPARISON_PAGES_EXCLUDED_DEPT_IDS. */
export function filterSitesForComparisonPages(sites) {
  return sites.filter(
    (s) => s.id !== 0 && !COMPARISON_PAGES_EXCLUDED_DEPT_IDS.has(s.id)
  );
}
