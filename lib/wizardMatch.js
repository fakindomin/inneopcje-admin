import { getPool } from "./db.js";
import { classifyChipsetTier } from "./chipsetTiers.js";

// Turns a wizard profile (lib/wizardTree.js resolvePath's "wynik" step)
// into one real phone from the catalog. price_tier is the only HARD
// filter — every other preference ranks candidates rather than filtering
// them, because the catalog doesn't cover every brand at every tier (e.g.
// no budget Xiaomi), so a hard filter could leave a whole tier with zero
// candidates. This mirrors the relax-rather-than-omit philosophy in
// lib/matching.js.
//
// Ranking is LEXICOGRAPHIC: candidates are compared one criterion at a
// time, in the order the user actually stated they matter, and only an
// exact tie falls through to the next one. Two things were measured
// against the real ~450-phone catalog before landing on this shape:
//
// 1. A blended sum (score + weighted bonuses) let "good at everything"
//    phones dominate almost every tier regardless of the stated priority
//    - only 14-22% of the catalog could ever win at all.
// 2. Ranking priority tags by their RAW value (exact camera megapixels,
//    exact battery mAh) was worse, not better: with 100+ phones in a
//    tier, there is usually exactly one phone holding the single highest
//    number, and it then wins 100% of every path where that dimension is
//    the priority. Budzetowy collapsed to 3 winning phones total.
//
// The fix for (2) is grading each priority dimension into quintiles
// (1-5) relative to the tier's own candidates, and comparing grades -
// "one of the best fifth in this tier" decides ties, not "the single
// absolute record holder", leaving a real shortlist for screen fit /
// brand / foldable / the catalog's own score to keep differentiating.

// wydajność is classified from the chipset NAME, not read from
// specs.chipset_tier - only 26/454 products in the catalog have that
// field set at all (the rest are from a later bulk import that never
// filled it), and reading it as missing = 0 silently treated every one
// of those 428 phones as having zero performance. Spot-checking also
// found the same chipset name recorded under two different tier values
// on different products, so a single consistent classifier is also more
// trustworthy than the field itself. See lib/chipsetTiers.js.
function tagValue(tag, specs) {
  if (tag === "aparat") return Number(specs?.camera_main_mp) || 0;
  if (tag === "bateria") return Number(specs?.battery_mah) || 0;
  if (tag === "wydajnosc") return classifyChipsetTier(specs?.chipset);
  return 0;
}

// Catalog currently spans roughly 6.1"-6.9", so that's the window a
// preference is scored against.
function screenValue(preference, specs) {
  const size = Number(specs?.screen_size_inches);
  if (!preference || preference === "brak" || !Number.isFinite(size)) return 0;
  if (preference === "kompakt") return Math.max(0, 6.9 - size);
  if (preference === "duzy") return Math.max(0, size - 6.1);
  return 0;
}

// rozmiar_ekranu is bidirectional (kompakt vs duży), unlike the other
// tags, which are always "maximize" - so grading it needs the profile's
// stated direction, not just the raw spec.
function valueGetter(tag, profile) {
  if (tag === "rozmiar_ekranu") return (specs) => screenValue(profile.screenPreference, specs);
  return (specs) => tagValue(tag, specs);
}

// Returns a function grading any candidate 1-5 on `tag`, relative to the
// value distribution across `candidates` (the tier being matched against).
function buildGrader(candidates, tag, profile) {
  const getValue = valueGetter(tag, profile);
  const values = candidates.map((c) => getValue(c.specs)).sort((a, b) => a - b);
  const n = values.length;
  return (candidate) => {
    if (n === 0) return 0;
    const v = getValue(candidate.specs);
    let countAtOrBelow = 0;
    for (const x of values) {
      if (x <= v) countAtOrBelow++;
    }
    return Math.max(1, Math.ceil((countAtOrBelow / n) * 5));
  };
}

function brandFit(candidate, profile) {
  if (profile.marka === "tak" && profile.producent && profile.producent !== "nietypowe") {
    return candidate.brand === profile.producent ? 1 : -1;
  }
  if (profile.marka === "tak" && profile.producent === "nietypowe") {
    return candidate.brand_recognition === "niche" ? 1 : 0;
  }
  if (profile.marka === "niszowa") {
    return candidate.brand_recognition === "niche" ? 1 : -1;
  }
  return 0;
}

// Convention: a foldable product has `specs.foldable: true` (set via the
// admin product form's raw specs JSON — no dedicated column yet).
function foldFit(candidate, profile) {
  const isFoldable = candidate.specs?.foldable === true;
  if (profile.foldable === "skladany") return isFoldable ? 1 : -1;
  if (profile.foldable === "klasyczny" && isFoldable) return -1;
  return 0;
}

export function pickBest(candidates, profile) {
  if (candidates.length === 0) return null;

  const graders = profile.tags.map((tag) => buildGrader(candidates, tag, profile));

  function compare(a, b) {
    for (let i = 0; i < graders.length; i++) {
      const diff = graders[i](b) - graders[i](a);
      if (diff !== 0) return diff;
    }

    const screenDiff = screenValue(profile.screenPreference, b.specs) - screenValue(profile.screenPreference, a.specs);
    if (screenDiff !== 0) return screenDiff;

    const brandDiff = brandFit(b, profile) - brandFit(a, profile);
    if (brandDiff !== 0) return brandDiff;

    const foldDiff = foldFit(b, profile) - foldFit(a, profile);
    if (foldDiff !== 0) return foldDiff;

    return (Number(b.score) || 0) - (Number(a.score) || 0);
  }

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (compare(candidates[i], best) < 0) best = candidates[i];
  }
  return best;
}

export async function matchTelefon(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.price_tier = $1`,
    [profile.budzet]
  );

  return pickBest(result.rows, profile);
}
