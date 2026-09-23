// Classifies a telewizory `specs.display_technology` string into a 1-5
// image-quality tier, independent of screen size or price - same reasoning
// as lib/chipsetTiers.js for telefony's "wydajność": a curated/manually
// entered tier per product risks drifting (the same panel technology
// getting different tiers on different products), so this always
// classifies from the technology NAME instead, once, consistently.
//
// Rules are checked in order, highest tier first, first match wins - so a
// name that could match multiple rules (e.g. "QD-OLED" also contains
// "OLED") resolves to its most specific/highest rule.
const RULES = [
  // --- Tier 5: best-in-class panel tech ---
  [/micro\s*rgb/i, 5],
  [/qd-?oled/i, 5],

  // --- Tier 4: OLED, and the best LCD backlighting (full-array Mini-LED) ---
  [/oled/i, 4], // plain/WOLED (QD-OLED already claimed above)
  [/neo\s*qled/i, 4], // Samsung's own Mini-LED QLED branding
  [/mini-?led/i, 4],

  // --- Tier 3: quantum-dot LCD without Mini-LED backlighting ---
  [/qned/i, 3],
  [/qled/i, 3],

  // --- Tier 1: plain LED-LCD, any backlighting style ---
  [/edge_?led/i, 1],
  [/direct_?led/i, 1],
  [/^led$/i, 1],
  [/led/i, 1], // catch-all for any other plain-LED phrasing
];

const DEFAULT_TIER = 2;

export function classifyDisplayTechTier(displayTechnology) {
  if (!displayTechnology) return DEFAULT_TIER;
  for (const [pattern, tier] of RULES) {
    if (pattern.test(displayTechnology)) return tier;
  }
  return DEFAULT_TIER;
}
