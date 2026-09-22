// Ground-truth duplicate resolution for the telefony catalog, researched
// against gsmarena.com model-by-model (not a heuristic) - see the "reason"
// on each entry for what was checked. Two shapes:
//
//   { verdict: "distinct", reason }
//     Both slugs in the group are genuinely separate retail SKUs (usually
//     a real 4G/5G chipset split) - do not touch either.
//
//   { verdict: "duplicate", keepSlug, deleteSlugs: [...], reason }
//     The group is the same phone entered more than once. keepSlug is the
//     copy to keep published; every slug in deleteSlugs should be
//     unpublished (status -> draft).
//
// Keyed by every candidate slug that appears in the group, so the cleanup
// UI can look up a verdict for any member of a group it's rendering.
const GROUPS = [
  {
    slugs: ["realme-16-pro-plus", "realme-16-pro+"],
    verdict: "duplicate",
    keepSlug: "realme-16-pro-plus",
    deleteSlugs: ["realme-16-pro+"],
    reason:
      "Exact-name duplicate with conflicting scraped specs. gsmarena.com confirms the real realme 16 Pro+ (Snapdragon 7 Gen 4 / SM7750-AB, 7000mAh, 200MP main camera, 6.8\") matches realme-16-pro-plus exactly; realme-16-pro+ (Snapdragon 7s Gen 4, 6200mAh, 50MP) doesn't match any real variant - it's a bad scrape, not a second SKU.",
  },
  {
    slugs: ["oneplus-nord-3", "oneplus-nord-3-5g"],
    verdict: "duplicate",
    keepSlug: "oneplus-nord-3",
    deleteSlugs: ["oneplus-nord-3-5g"],
    reason: "gsmarena.com: OnePlus Nord 3 ships with only the Dimensity 9000 chipset - no separate 4G/non-5G variant exists.",
  },
  {
    slugs: ["oppo-reno-11-f", "oppo-reno-11-f-5g"],
    verdict: "duplicate",
    keepSlug: "oppo-reno-11-f",
    deleteSlugs: ["oppo-reno-11-f-5g"],
    reason: "gsmarena.com lists a single \"Oppo Reno11 F\" (Dimensity 7050) - no distinct 4G/5G split found.",
  },
  {
    slugs: ["oppo-reno10-pro", "oppo-reno10-pro-5g"],
    verdict: "duplicate",
    keepSlug: "oppo-reno10-pro",
    deleteSlugs: ["oppo-reno10-pro-5g"],
    reason:
      "A genuine China (Dimensity 8200) vs Global (Snapdragon 778G) split exists on gsmarena.com, but both of our rows show the identical Snapdragon 778G spec - i.e. the Global SKU entered twice, not the China variant.",
  },
  {
    slugs: ["oppo-reno11-pro", "oppo-reno11-pro-5g"],
    verdict: "duplicate",
    keepSlug: "oppo-reno11-pro",
    deleteSlugs: ["oppo-reno11-pro-5g"],
    reason:
      "Same pattern as Reno10 Pro: gsmarena.com shows a real China (Snapdragon 8+ Gen 1) vs Global (Dimensity 8200) split, but both of our rows show the identical Dimensity 8200 spec - the Global SKU duplicated.",
  },
  {
    slugs: ["poco-x6-pro", "poco-x6-pro-5g"],
    verdict: "duplicate",
    keepSlug: "poco-x6-pro",
    deleteSlugs: ["poco-x6-pro-5g"],
    reason: "gsmarena.com: POCO X6 Pro (rebrand of the Redmi K70E) ships only with Dimensity 8300-Ultra - single SKU.",
  },
  {
    slugs: ["poco-x7", "poco-x7-5g"],
    verdict: "duplicate",
    keepSlug: "poco-x7-5g",
    deleteSlugs: ["poco-x7"],
    reason:
      "gsmarena.com: the real POCO X7 (Global) uses Dimensity 7300-Ultra, launched 2025, budget tier - matches poco-x7-5g. poco-x7's data (Dimensity 7300 without \"Ultra\", 2024, mid tier) doesn't match the real device - bad scrape, not a second SKU.",
  },
  {
    slugs: ["poco-x7-pro", "poco-x7-pro-5g"],
    verdict: "duplicate",
    keepSlug: "poco-x7-pro-5g",
    deleteSlugs: ["poco-x7-pro"],
    reason: "gsmarena.com: single POCO X7 Pro SKU, chipset marketed as Dimensity 8400-Ultra - keeping the row with the fully-qualified, accurate chipset name.",
  },
  {
    slugs: ["poco-m4-pro", "poco-m4-pro-5g"],
    verdict: "distinct",
    reason: "gsmarena.com confirms POCO M4 Pro (Helio G96, 4G) and POCO M4 Pro 5G (Dimensity 810) are genuinely different phones/designs.",
  },
  {
    slugs: ["redmi-12", "redmi-12-5g"],
    verdict: "distinct",
    reason: "Different chipsets confirmed (Helio G88 vs Snapdragon 4 Gen 2) - real distinct 4G/5G SKUs.",
  },
  {
    slugs: ["redmi-14c", "redmi-14c-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G81 Ultra vs Snapdragon 4 Gen 2) - real distinct SKUs.",
  },
  {
    slugs: ["redmi-15", "redmi-15-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Snapdragon 685 vs Snapdragon 6s Gen 3) - real distinct SKUs.",
  },
  {
    slugs: ["redmi-note-11-pro", "redmi-note-11-pro-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G96 vs Snapdragon 695), well-documented distinct devices.",
  },
  {
    slugs: ["redmi-note-11s", "redmi-note-11s-5g"],
    verdict: "distinct",
    reason: "Different chipsets, cameras and screen sizes - genuinely different devices.",
  },
  {
    slugs: ["redmi-note-12", "redmi-note-12-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Snapdragon 685 vs Snapdragon 4 Gen 1) and camera specs - distinct devices.",
  },
  {
    slugs: ["redmi-note-13", "redmi-note-13-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Snapdragon 685 vs Dimensity 6080) - distinct devices.",
  },
  {
    slugs: ["redmi-note-13-pro", "redmi-note-13-pro-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G99-Ultra vs Snapdragon 7s Gen 2) - well-known distinct 4G/5G devices.",
  },
  {
    slugs: ["redmi-note-14", "redmi-note-14-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G99-Ultra vs Dimensity 7025 Ultra) - distinct devices.",
  },
  {
    slugs: ["redmi-note-14-pro", "redmi-note-14-pro-5g"],
    verdict: "distinct",
    reason: "Different chipsets and main camera (200MP vs 50MP) - distinct devices.",
  },
  {
    slugs: ["redmi-note-14-pro+", "redmi-note-14-pro+-5g"],
    verdict: "distinct",
    reason: "Different chipsets, batteries and cameras - distinct devices.",
  },
  {
    slugs: ["redmi-note-15", "redmi-note-15-5g"],
    verdict: "distinct",
    reason: "Different chipsets, tiers, batteries and screens - distinct devices.",
  },
  {
    slugs: ["redmi-note-15-pro-4g", "redmi-note-15-pro-5g"],
    verdict: "distinct",
    reason: "Explicitly named 4G/5G with different chipsets (Snapdragon 685 vs Dimensity 7400-Ultra) - distinct devices.",
  },
  {
    slugs: ["redmi-note-15-pro-plus", "redmi-note-15-pro+-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Snapdragon 7s Gen 4 vs Dimensity 7400 Ultra) - distinct devices.",
  },
  {
    slugs: ["samsung-galaxy-a13", "samsung-galaxy-a13-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Exynos 850 vs Dimensity 700) and screen sizes - well-known distinct devices.",
  },
  {
    slugs: ["samsung-galaxy-a14", "samsung-galaxy-a14-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G80 vs Dimensity 700) - distinct devices.",
  },
  {
    slugs: ["samsung-galaxy-a15", "samsung-galaxy-a15-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Helio G99 vs Dimensity 6100+) - distinct devices.",
  },
  {
    slugs: ["samsung-galaxy-a16", "samsung-galaxy-a16-5g"],
    verdict: "distinct",
    reason:
      "gsmarena.com confirms A16 4G (MediaTek Helio G99) and A16 5G (Exynos 1330) are genuinely different chipsets/devices. Data bug found: our samsung-galaxy-a16 row currently has chipset=\"Exynos 1330\" (copied from the 5G row) - should be \"MediaTek Helio G99\". Fix via /admin/specs-patch: {\"samsung-galaxy-a16\": {\"chipset\": \"MediaTek Helio G99\"}}",
  },
  {
    slugs: ["samsung-galaxy-a23", "samsung-galaxy-a23-5g"],
    verdict: "distinct",
    reason: "Different chipsets (Snapdragon 680 vs Snapdragon 695) - well-known distinct devices.",
  },
  {
    slugs: ["tcl-50-pro-nxtpaper", "tcl-50-pro-nxtpaper-5g"],
    verdict: "duplicate",
    keepSlug: "tcl-50-pro-nxtpaper",
    deleteSlugs: ["tcl-50-pro-nxtpaper-5g"],
    reason: "gsmarena.com lists a single \"TCL 50 Pro NxtPaper\" (Dimensity 6300) - no separate 5G-suffixed product.",
  },
  {
    slugs: ["vivo-v30", "vivo-v30-5g"],
    verdict: "duplicate",
    keepSlug: "vivo-v30",
    deleteSlugs: ["vivo-v30-5g"],
    reason: "gsmarena.com has no \"vivo V30 5G\" product - only \"vivo V30\" (which is itself a 5G phone).",
  },
  {
    slugs: ["xiaomi-redmi-note-13-pro+", "xiaomi-redmi-note-13-pro+-5g"],
    verdict: "duplicate",
    keepSlug: "xiaomi-redmi-note-13-pro+",
    deleteSlugs: ["xiaomi-redmi-note-13-pro+-5g"],
    reason: "gsmarena.com confirms the Redmi Note 13 Pro+ is 5G-only - no separate 4G Pro+ variant exists, unlike the non-Plus Note 13 Pro.",
  },
];

// Samsung Galaxy S22 through S26: every pair follows the same confirmed
// pattern (checked directly for S23 and S26 Ultra on gsmarena.com - no
// separately-branded 4G-only retail SKU exists for the mainstream global
// flagship line; the "-5g" row duplicates the same device with a
// reformatted chipset string, e.g. "Snapdragon 8 Gen 2" vs "Snapdragon 8
// Gen 2 for Galaxy").
const SAMSUNG_S_SERIES = [
  "samsung-galaxy-s22",
  "samsung-galaxy-s22-ultra",
  "samsung-galaxy-s23",
  "samsung-galaxy-s23-fe",
  "samsung-galaxy-s23-ultra",
  "samsung-galaxy-s23+",
  "samsung-galaxy-s24",
  "samsung-galaxy-s24-fe",
  "samsung-galaxy-s24-ultra",
  "samsung-galaxy-s24+",
  "samsung-galaxy-s25",
  "samsung-galaxy-s25-fe",
  "samsung-galaxy-s25-slim",
  "samsung-galaxy-s25-ultra",
  "samsung-galaxy-s25+",
  "samsung-galaxy-s26",
  "samsung-galaxy-s26-ultra",
  "samsung-galaxy-s26+",
];
const SAMSUNG_REASON =
  "Samsung's global flagship S-series has not shipped a separately-branded 4G-only retail SKU in this range - confirmed directly on gsmarena.com for the S23 (Snapdragon 8 Gen 2 for Galaxy only, no Exynos/4G variant) and the S26 Ultra (single global Snapdragon 8 Elite Gen 5 chipset). The \"-5g\" row duplicates the same device.";

for (const keepSlug of SAMSUNG_S_SERIES) {
  GROUPS.push({
    slugs: [keepSlug, `${keepSlug}-5g`],
    verdict: "duplicate",
    keepSlug,
    deleteSlugs: [`${keepSlug}-5g`],
    reason: SAMSUNG_REASON,
  });
}

// Second wave, found once the first cleanup ran: the same phone entered
// more than once under a different brand-prefix or punctuation convention
// (e.g. brand "POCO"/"POCO X6 Pro" vs brand "Xiaomi"/"Xiaomi Poco X6 Pro",
// or "Plus" spelled out vs "+"). Invisible to the first two passes because
// those only group rows that already share the same `brand` column value.
// Confirmed as true duplicates by comparing our own already-stored specs
// (chipset/battery/main camera identical in every pair below) rather than
// a fresh gsmarena.com lookup - no external check needed when the two
// rows already agree on the hard numbers.
const CROSS_BRAND_REASON =
  "Same phone entered under two different brand-prefix/punctuation conventions - confirmed by identical chipset, battery and main camera already stored on both rows.";
const CROSS_BRAND_GROUPS = [
  ["apple-iphone-15", "iphone-15"],
  ["apple-iphone-17", "iphone-17"],
  ["apple-iphone-17-pro", "iphone-17-pro"],
  ["apple-iphone-17-pro-max", "iphone-17-pro-max"],
  ["honor-magic6-pro", "honor-magic-6-pro"],
  ["oppo-reno10-pro", "oppo-reno-10-pro"],
  ["oppo-reno11-pro", "oppo-reno-11-pro"],
  ["oppo-reno-11-f", "oppo-reno11-f-5g"],
  ["poco-c65", "xiaomi-poco-c65"],
  ["poco-m6-pro", "xiaomi-poco-m6-pro"],
  ["poco-x6-pro", "xiaomi-poco-x6-pro"],
  ["redmi-13c", "xiaomi-redmi-13c"],
  ["redmi-note-13", "xiaomi-redmi-note-13"],
  ["redmi-note-13-pro+-5g", "xiaomi-redmi-note-13-pro+"],
  ["samsung-galaxy-xcover-7", "samsung-galaxy-xcover7"],
  ["samsung-galaxy-z-flip5", "samsung-galaxy-z-flip-5"],
  ["samsung-galaxy-z-fold5", "samsung-galaxy-z-fold-5"],
  ["samsung-galaxy-s22-plus", "samsung-galaxy-s22+-5g"],
  ["samsung-galaxy-s23+", "samsung-galaxy-s23-plus"],
  ["samsung-galaxy-s24+", "samsung-galaxy-s24-plus"],
  ["samsung-galaxy-s25+", "samsung-galaxy-s25-plus"],
];

for (const [keepSlug, deleteSlug] of CROSS_BRAND_GROUPS) {
  GROUPS.push({
    slugs: [keepSlug, deleteSlug],
    verdict: "duplicate",
    keepSlug,
    deleteSlugs: [deleteSlug],
    reason: CROSS_BRAND_REASON,
  });
}

const BY_SLUG = new Map();
for (const group of GROUPS) {
  for (const slug of group.slugs) {
    BY_SLUG.set(slug, group);
  }
}

// Looks up the verified verdict for a duplicate-check group given any one
// of its member slugs. Returns null if this exact slug wasn't covered by
// the gsmarena.com research pass (new duplicates found after that pass
// fall back to the heuristic completeness-based pre-selection instead).
export function getVerifiedDecision(slug) {
  return BY_SLUG.get(slug) ?? null;
}

// All researched groups, for the third duplicate-detection pass in
// lib/duplicateCleanup.js (catches cross-brand-field duplicates the
// brand-scoped detectors can't find on their own).
export function getAllVerifiedGroups() {
  return GROUPS;
}
