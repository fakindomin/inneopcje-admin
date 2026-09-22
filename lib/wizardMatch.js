import { getPool } from "./db.js";
import { classifyChipsetTier } from "./chipsetTiers.js";

// Turns a wizard profile (lib/wizardTree.js resolvePath's "wynik" step)
// into one real phone from the catalog. price_tier is always a HARD
// filter; a concrete producent choice (profile.marka === "tak" with a
// real brand, not "nietypowe") is ALSO a hard filter - see pickBest()
// below - because lib/wizardBrands.js only ever offers a producent the
// catalog actually carries in that price tier, so narrowing to it can't
// empty the tier. Every other preference ranks candidates rather than
// filtering them, because the catalog doesn't cover every brand/niche
// combination at every tier, so a hard filter there could leave a whole
// tier with zero candidates. This mirrors the relax-rather-than-omit
// philosophy in lib/matching.js.
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
// jakosc_ekranu prefers the real, hand-researched 1-5 score imported from
// data/telefony_merged.json (see lib/telefonyMergedImport.js) - falls back
// to a coarse AMOLED(2)/LED(1)/unknown(0) proxy from screen_panel_type only
// for any product that dataset doesn't cover yet.
function tagValue(tag, specs) {
  if (tag === "aparat") return Number(specs?.camera_main_mp) || 0;
  if (tag === "bateria") return Number(specs?.battery_mah) || 0;
  if (tag === "wydajnosc") return classifyChipsetTier(specs?.chipset);
  if (tag === "jakosc_ekranu") {
    if (Number.isFinite(specs?.jakosc_ekranu_score)) return specs.jakosc_ekranu_score;
    return specs?.screen_panel_type === "AMOLED" ? 2 : specs?.screen_panel_type === "LED" ? 1 : 0;
  }
  return 0;
}

// Catalog currently spans roughly 6.1"-6.9", so that's the window a
// preference is scored against. "sredni_rozmiar" ("złoty środek") isn't a
// direction like kompakt/duzy - it rewards closeness to the midpoint of
// that range instead of a distance-from-one-edge, so a phone dead in the
// middle scores best and either extreme scores worst.
function screenValue(preference, specs) {
  const size = Number(specs?.screen_size_inches);
  if (!preference || preference === "brak" || !Number.isFinite(size)) return 0;
  if (preference === "kompakt") return Math.max(0, 6.9 - size);
  if (preference === "duzy") return Math.max(0, size - 6.1);
  if (preference === "sredni_rozmiar") return -Math.abs(size - 6.5);
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

// A concrete producent is filtered in pickBest() before this ever runs -
// see `pool` there - so this only still has a real branch to arbitrate for
// the fuzzier marka answers, where a hard filter risks emptying the tier:
// "known brand, no specific one" (niche as a soft downrank) and "show me
// niche brands too" (niche as a soft uprank).
function brandFit(candidate, profile) {
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

  // A concrete producent choice (e.g. "Samsung") is a hard filter, not a
  // ranking bonus - lib/wizardBrands.js only ever offers a producent the
  // catalog carries in this price tier, so this can't legitimately empty
  // the pool. Kept defensive anyway (fall back to the unfiltered
  // candidates rather than ever returning null for an answered path) in
  // case that guarantee is ever violated by stale/edited data.
  let pool = candidates;
  if (profile.marka === "tak" && profile.producent && profile.producent !== "nietypowe") {
    const brandMatches = candidates.filter((c) => c.brand === profile.producent);
    if (brandMatches.length > 0) pool = brandMatches;
  }

  const graders = profile.tags.map((tag) => buildGrader(pool, tag, profile));

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

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (compare(pool[i], best) < 0) best = pool[i];
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
