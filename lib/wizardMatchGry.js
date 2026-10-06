import { getPool } from "./db.js";

// Mirrors lib/wizardMatchTv.js's approach, adapted to gry's 3 tags
// (fabula/rozgrywka/spoleczny instead of obraz/gaming/dzwiek) and two hard
// filters that telewizory doesn't have: platforma (a game simply doesn't
// run on hardware you don't own - no soft tiebreak makes sense here) and
// tryb (someone who wants solo shouldn't get a game with no single-player
// mode at all). No recency filter - unlike display tech, an older game
// isn't worse for being old, so that telewizory/telefony heuristic is
// deliberately dropped rather than carried over.
function tagValue(tag, specs) {
  if (tag === "fabula") return Number(specs?.fabula_score) || 0;
  if (tag === "rozgrywka") return Number(specs?.rozgrywka_score) || 0;
  if (tag === "spoleczny") return Number(specs?.spoleczny_score) || 0;
  return 0;
}

// Dataset's sesja_minuty spans 10-120 with a median of 45 - the real
// midpoint of the catalog, same reasoning as telewizory's screen-size
// pivot (the center of its own data, not an arbitrary round number).
const SESJA_PIVOT = 45;

function sesjaValue(preference, specs) {
  const minuty = Number(specs?.sesja_minuty);
  if (!preference || !Number.isFinite(minuty)) return 0;
  if (preference === "krotkie") return Math.max(0, SESJA_PIVOT - minuty);
  if (preference === "dlugie") return Math.max(0, minuty - SESJA_PIVOT);
  if (preference === "zloty_srodek") return -Math.abs(minuty - SESJA_PIVOT);
  return 0;
}

function valueGetter(tag, profile) {
  if (tag === "sesja") return (specs) => sesjaValue(profile.sesjaPreference, specs);
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

// Hard filters: platforma (must actually own the hardware) and tryb
// (solo-seeking players shouldn't see a multiplayer-only game, and vice
// versa) - "oba" on either side means "anything matches" for that filter.
function matchesHardFilters(candidate, profile) {
  const specs = candidate.specs || {};
  const platformy = Array.isArray(specs.platformy) ? specs.platformy : [];
  if (profile.platforma && !platformy.includes(profile.platforma)) return false;

  if (profile.tryb === "solo" && !["solo", "oba"].includes(specs.tryb)) return false;
  if (profile.tryb === "multiplayer" && !["multiplayer", "oba"].includes(specs.tryb)) return false;

  return true;
}

// Unlike telewizory's producent (where "no match for this brand" can fall
// back to "any brand" - you can just buy a different TV brand), platforma
// and tryb here are never relaxed: a candidate that doesn't run on the
// chosen hardware, or has no mode the player asked for, is never a
// legitimate recommendation, so an empty pool after this filter is a real
// "no match in this segment" rather than something to paper over.
export function narrowPool(candidates, profile) {
  let pool = candidates.filter((c) => matchesHardFilters(c, profile));

  const tags = profile.tags ?? [];
  for (let rank = 0; rank < tags.length; rank++) {
    pool = narrowByTag(pool, tags[rank], profile, rank);
  }

  return pool;
}

export function pickBest(candidates, profile) {
  if (candidates.length === 0) return null;

  const pool = narrowPool(candidates, profile);
  if (pool.length === 0) return null;
  const graders = profile.tags.map((tag, rank) => buildGrader(pool, tag, profile, resolutionForRank(rank)));

  function compare(a, b) {
    for (let i = 0; i < graders.length; i++) {
      const diff = graders[i](b) - graders[i](a);
      if (diff !== 0) return diff;
    }

    const sesjaDiff = sesjaValue(profile.sesjaPreference, b.specs) - sesjaValue(profile.sesjaPreference, a.specs);
    if (sesjaDiff !== 0) return sesjaDiff;

    return (Number(b.score) || 0) - (Number(a.score) || 0);
  }

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (compare(pool[i], best) < 0) best = pool[i];
  }
  return best;
}

export async function matchGre(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier, p.release_year
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'gry' AND p.status = 'published' AND p.price_tier = $1`,
    [profile.budzet]
  );

  return pickBest(result.rows, profile);
}
