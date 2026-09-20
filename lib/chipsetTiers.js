// Classifies a free-text `specs.chipset` name into the same 1-5
// performance scale `chipset_tier` used to be hand-entered on. Built
// because only 26/454 products in the catalog have chipset_tier set at
// all (the original seed) - the other 428 (from a later bulk import) have
// none, and reading a missing chipset_tier as 0 silently made every one
// of them look like the worst possible phone for "wydajność" regardless
// of their real chipset. This always classifies from the chipset NAME
// instead of trusting chipset_tier, since spot-checking the diagnostic
// found the same chipset name ("Snapdragon 7 Gen 4") recorded under two
// different tier values across different products - a single, consistent
// classifier beats a field that isn't reliably curated.
//
// Rules are checked in order, highest tier first, first match wins - so a
// more specific rule (an exact known model) only needs to sit before a
// broader one for the same chip family, not tier-adjacent families.
// Anchored against the 26 pre-existing hand-curated values where they
// exist (marked below); everything else is classified from general,
// public knowledge of each chipset family's real-world performance tier.
// Not exact - Samsung's own Exynos numbering in particular isn't strictly
// ordinal (1580 outperforms the higher-numbered 1680) - but a reasoned
// estimate for 428 phones beats treating all of them as zero.
const RULES = [
  // --- Tier 5: current top-of-line flagship ---
  [/8\s*Elite/i, 5], // Snapdragon 8 Elite / 8 Elite Gen 5 / "for Galaxy" — anchor: 5
  [/A19|A20\s*Pro|A18\s*Pro/i, 5], // Apple A19 / A19 Pro / A20 Pro / A18 Pro — anchor: A19=5, A19 Pro=5
  [/Tensor\s*G[56]/i, 5], // Google Tensor G5 / G6 — anchor: G5=5
  [/Exynos\s*2[56]00/i, 5], // Exynos 2500 / 2600 (current flagship Exynos)

  // --- Tier 4: strong / previous-gen flagship, sub-flagship ---
  [/8s?\+?\s*Gen/i, 4], // Snapdragon 8 Gen X / 8+ Gen 1 / 8s Gen X (numbered, not Elite) — anchor: 8 Gen 5=4
  [/Dimensity\s*9\d{3}/i, 4], // MediaTek Dimensity 9xxx (4-digit) family — anchor: 9500=4. Requires the full
  // 4-digit number, not just a leading "9" - the OLD MediaTek numbering (Dimensity 900/920/930, all modest
  // chips) would otherwise wrongly match a bare "Dimensity 9" prefix and get promoted to top tier.
  [/A1[5-8]/i, 4], // Apple A15/A16/A17 Pro/A18 (A18 Pro already claimed above) — anchor: A16 Bionic=4
  [/Exynos\s*2[0-4]00e?/i, 4], // Exynos 2200 / 2400 / 2400e
  [/Tensor\s*G[34]/i, 4], // Google Tensor G3 / G4
  [/Kirin\s*90/i, 4], // Huawei Kirin 9010 / 9020 / 9000S1 (Huawei's current top chips)

  // --- Tier 3: upper-midrange ---
  [/Dimensity\s*8\d{3}/i, 3], // MediaTek Dimensity 8xxx (4-digit) family — anchor: 8500-Ultra=3
  [/7\+?\s*Gen/i, 3], // Snapdragon 7 Gen X / 7+ Gen X (not "7s", see tier 2) — anchor: 7 Gen 4=3
  [/\b888\b|\b870\b/i, 3], // legacy Snapdragon flagship (2021-era, still capable)
  [/Exynos\s*1580\b/i, 3],
  [/Exynos\s*1480\b/i, 3],
  [/Tensor\s*G2/i, 3],

  // --- Tier 2: midrange ---
  [/Dimensity\s*7\d{3}/i, 2], // MediaTek Dimensity 7xxx (4-digit) family — anchor: 7300=2
  [/7s\+?\s*Gen/i, 2], // Snapdragon 7s Gen X — anchor: 7s Gen 4=2
  [/6s?\+?\s*Gen/i, 2], // Snapdragon 6 Gen X / 6s Gen X
  [/778G|780G|782G|750G|732G/i, 2], // older Qualcomm "7xxG" midrange line
  [/Helio\s*(G9[1-9]|G100)/i, 2], // newer, more capable Helio G9x/G100
  [/Exynos\s*1380\b/i, 2],
  [/Exynos\s*1680\b/i, 2], // anchor: 1680=2

  // --- Tier 1: entry / budget ---
  [/Unisoc/i, 1], // all Unisoc chips are entry-level
  [/Helio/i, 1], // remaining, older Helio (G25/G35/G36/G80/G81/G85/G88/A22)
  [/Dimensity/i, 1], // remaining Dimensity — 6xxx family and old numbering (900/920/930/1080/1300) — anchor: 6300=1
  [/Exynos\s*1330\b|Exynos\s*1280\b|Exynos\s*850\b/i, 1], // anchor: 1330=1
  [/Snapdragon\s*4\s*Gen|480|685|695/i, 1], // entry-level numbered/legacy Snapdragon

  // --- Recognized vendor, unmatched exact model: land on a plausible
  // middle tier rather than guessing an extreme ---
  [/Apple/i, 3],
  [/Kirin/i, 2],
  [/Exynos/i, 2],
  [/Snapdragon|Qualcomm/i, 2],
];

const DEFAULT_TIER = 2;

export function classifyChipsetTier(chipsetName) {
  if (!chipsetName) return DEFAULT_TIER;
  for (const [pattern, tier] of RULES) {
    if (pattern.test(chipsetName)) return tier;
  }
  return DEFAULT_TIER;
}
