import { getPool } from "./db.js";
import { obrazScore, gamingScore, dzwiekScore } from "./telewizoryMergedImport.js";

// Mirrors lib/wizardMatch.js's approach for telefony, adapted to
// telewizory's 3 tags (obraz/gaming/dzwiek instead of
// aparat/bateria/wydajnosc/jakosc_ekranu) and its simpler profile shape
// (lib/wizardTreeTv.js resolvePath's "wynik" step: no foldable, no
// live-catalog-derived producent/screen-range steps). See that file's
// header comment for the full reasoning behind lexicographic ranking,
// quintile grading, and rank-based elimination - none of that changes
// here, only which tags/dimensions exist.
function tagValue(tag, specs) {
  if (tag === "obraz") return obrazScore(specs || {});
  if (tag === "gaming") return gamingScore(specs || {});
  if (tag === "dzwiek") return dzwiekScore(specs || {});
  return 0;
}

// Catalog spans roughly 32"-115" (median ~65"), but rozmiar_ekranu's own
// labels already anchor a natural pivot: "maly" is 43"-50", "duzy" is
// 75"+, and "sredni_rozmiar" ("złoty środek") is 55"-65" - so 60" (that
// band's center) is the single pivot every preference grades against,
// same bidirectional shape as telefony's screenValue().
const SCREEN_PIVOT = 60;

function screenValue(preference, specs) {
  const size = Number(specs?.screen_size_inches);
  if (!preference || !Number.isFinite(size)) return 0;
  if (preference === "maly") return Math.max(0, SCREEN_PIVOT - size);
  if (preference === "duzy") return Math.max(0, size - SCREEN_PIVOT);
  if (preference === "sredni_rozmiar") return -Math.abs(size - SCREEN_PIVOT);
  return 0;
}

function valueGetter(tag, profile) {
  if (tag === "rozmiar_ekranu") return (specs) => screenValue(profile.screenPreference, specs);
  return (specs) => tagValue(tag, specs);
}

function buildGrader(candidates, tag, profile, buckets = 5) {
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
    return Math.max(1, Math.ceil((countAtOrBelow / n) * buckets));
  };
}

function resolutionForRank(rank) {
  if (rank === 0) return 10;
  if (rank === 1) return 5;
  return 3;
}

// A concrete producent choice is already a hard filter (narrowPool below),
// so this only still arbitrates for "niszowa" - same guard as telefony's:
// every current telewizory entry is brand_recognition = 'mainstream' (no
// niche-brand data collected yet), so this is a harmless no-op tiebreaker
// until that changes, not a bug to fix here.
function brandFit(candidate, profile) {
  if (profile.marka === "niszowa") {
    return candidate.brand_recognition === "niche" ? 1 : -1;
  }
  return 0;
}

export function minVerdictReleaseYear() {
  return new Date().getFullYear() - 1;
}

export const MIN_POOL_SIZE = 8;

function keepFractionForRank(rank) {
  if (rank === 0) return 0.3;
  if (rank === 1) return 0.5;
  return null;
}

function narrowByTag(pool, tag, profile, rank) {
  const fraction = keepFractionForRank(rank);
  if (fraction === null) return pool;

  const getValue = valueGetter(tag, profile);
  const sorted = [...pool].sort((a, b) => getValue(b.specs) - getValue(a.specs));
  const keepCount = Math.min(sorted.length, Math.max(MIN_POOL_SIZE, Math.ceil(pool.length * fraction)));
  const filtered = sorted.slice(0, keepCount);
  return filtered.length >= MIN_POOL_SIZE ? filtered : pool;
}

function applyRecencyFilter(candidates) {
  const minYear = minVerdictReleaseYear();
  const recentMatches = candidates.filter((c) => Number(c.release_year) >= minYear);
  return recentMatches.length > 0 ? recentMatches : candidates;
}

export function narrowPool(candidates, profile) {
  let pool = candidates;
  if (profile.marka === "tak" && Array.isArray(profile.producent) && profile.producent.length > 0) {
    const brandMatches = candidates.filter((c) => profile.producent.includes(c.brand));
    if (brandMatches.length > 0) pool = brandMatches;
  }

  pool = applyRecencyFilter(pool);

  const tags = profile.tags ?? [];
  for (let rank = 0; rank < tags.length; rank++) {
    pool = narrowByTag(pool, tags[rank], profile, rank);
  }

  return pool;
}

export function pickBest(candidates, profile) {
  if (candidates.length === 0) return null;

  const pool = narrowPool(candidates, profile);
  const graders = profile.tags.map((tag, rank) => buildGrader(pool, tag, profile, resolutionForRank(rank)));

  function compare(a, b) {
    for (let i = 0; i < graders.length; i++) {
      const diff = graders[i](b) - graders[i](a);
      if (diff !== 0) return diff;
    }

    const screenDiff = screenValue(profile.screenPreference, b.specs) - screenValue(profile.screenPreference, a.specs);
    if (screenDiff !== 0) return screenDiff;

    const brandDiff = brandFit(b, profile) - brandFit(a, profile);
    if (brandDiff !== 0) return brandDiff;

    return (Number(b.score) || 0) - (Number(a.score) || 0);
  }

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (compare(pool[i], best) < 0) best = pool[i];
  }
  return best;
}

export async function matchTelewizor(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier, p.price_checked_at, p.release_year
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory' AND p.status = 'published' AND p.price_tier = $1`,
    [profile.budzet]
  );

  return pickBest(result.rows, profile);
}
