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
  [/micro rgb/i, 5],
  [/qd\s?oled/i, 5], // "QD OLED" (post-normalization) or "QDOLED" (no separator at all)

  // --- Tier 4: OLED, and the best LCD backlighting (full-array Mini-LED) ---
  [/oled/i, 4], // plain/WOLED (QD-OLED already claimed above)
  [/neo qled/i, 4], // Samsung's own Mini-LED QLED branding
  [/mini\s?led/i, 4], // "Mini LED" (post-normalization) or "MiniLED" (no separator at all)

  // --- Tier 3: quantum-dot LCD without Mini-LED backlighting ---
  [/qned/i, 3],
  [/qled/i, 3],

  // --- Tier 1: plain LED-LCD, any backlighting style ---
  [/edge led/i, 1],
  [/direct led/i, 1],
  [/^led$/i, 1],
  [/led/i, 1], // catch-all for any other plain-LED phrasing
];

const DEFAULT_TIER = 2;

// Source data spells multi-word technology names with spaces, hyphens or
// underscores interchangeably ("Neo QLED", "Neo_QLED", "Mini-LED") -
// normalizing every separator to a single space once here means the RULES
// above only need to handle one spelling instead of three.
function normalizeSeparators(text) {
  return text.replace(/[_-]+/g, " ");
}

export function classifyDisplayTechTier(displayTechnology) {
  if (!displayTechnology) return DEFAULT_TIER;
  const normalized = normalizeSeparators(displayTechnology);
  for (const [pattern, tier] of RULES) {
    if (pattern.test(normalized)) return tier;
  }
  return DEFAULT_TIER;
}
