/**
 * User-facing names for valet + coffee/Costa revenue (HSRL nominal group).
 * Backend `name` fields in sales-mix APIs use COFFEE_VALET_REVENUE_LABEL.
 */
export const COFFEE_VALET_REVENUE_LABEL = "Coffee & Valet";

export const COFFEE_VALET_PROFIT_LABEL = "Coffee & Valet profit";

/** Previous API / pie slice name — still matched for colors & dataset lookup. */
export const LEGACY_VALET_REVENUE_LABEL = "Valet Sales";

/** Older API payload used lowercase "valet" — still matched for colors & dataset lookup. */
export const LEGACY_COFFEE_VALET_API_NAME = "Coffee & valet";

export function matchesCoffeeValetRevenueName(name) {
  return (
    name === COFFEE_VALET_REVENUE_LABEL ||
    name === LEGACY_VALET_REVENUE_LABEL ||
    name === LEGACY_COFFEE_VALET_API_NAME
  );
}
