import { getPool } from "./db.js";
import { classifyChipsetTier } from "./chipsetTiers.js";
import { parsePriceLow } from "./matching.js";

// Turns a wizard profile (lib/wizardTree.js resolvePath's "wynik" step)
// into one real phone from the catalog. price_tier is always a HARD
// filter; a concrete producent choice (profile.marka === "tak" with a
// real brand) is ALSO a hard filter - see pickBest() below - because
// lib/wizardBrands.js only ever offers a producent the catalog actually
// carries in that price tier, so narrowing to it can't empty the tier.
// Every other preference ranks candidates rather than
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

// Returns a function grading any candidate 1-`buckets` on `tag`, relative
// to the value distribution across `candidates` (the tier being matched
// against). `buckets` defaults to 5 (quintiles); pickBest()/narrowByTag
// below pass a resolution that scales with the tag's PRIORITY RANK - a
// finer scale (more buckets) makes that tag discriminate more sharply and
// tie less often, a coarser one makes it more of a loose tiebreaker. See
// resolutionForRank().
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

// How finely a priority tag is graded, by its RANK in profile.tags (0 =
// the user's stated #1 priority). The user's own framing: priorytet #1
// should be "liczony mocniej" (count harder) and later ones progressively
// lighter, not an equal-weight blend - a finer scale for #1 means far
// fewer candidates land on the exact same grade, so it actually decides
// the winner instead of just narrowing to a shortlist other, unrelated
// criteria then pick from. #2 keeps the original quintile scale; #3+ is
// coarser still, since by that point it's meant only as a gentle tiebreak,
// not a real deciding factor.
function resolutionForRank(rank) {
  if (rank === 0) return 10;
  if (rank === 1) return 5;
  return 3;
}

// A concrete producent is filtered in pickBest() before this ever runs -
// see `pool` there - so this only still has a real branch to arbitrate for
// the "show me niche brands too" marka answer, where a hard filter risks
// emptying the tier.
function brandFit(candidate, profile) {
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

// The wizard's own RESULT should read as a current model - unlike the
// Taniej/Lepiej/Inaczej alternatives (lib/matching.js), which intentionally
// keep older models in the running as cheaper/different picks, this is the
// one phone we're telling the user to go buy. "This year or last year"
// scales with the calendar instead of a fixed cutoff. Exported so
// lib/wizardScreenRange.js can check catalog diversity against the exact
// same window this filter actually applies, instead of a second guess at
// "recent" that could silently drift out of sync with it.
export function minVerdictReleaseYear() {
  return new Date().getFullYear() - 1;
}

// Below this, a filter is judged too risky and skipped - this is exactly
// the guard that (1) in the file-level comment above was missing: that
// attempt hard-filtered priority tags with no floor at all and collapsed
// budżetowy to 3 winning phones. Kept as one shared constant so pickBest()
// and the "how many models match" test counter (app/api/wizard-live-count)
// always agree on what "too narrow" means.
export const MIN_POOL_SIZE = 8;

// How much of the pool survives elimination on a priority tag, by its
// RANK (0 = stated #1 priority) - null means "don't eliminate on this tag
// at all, only rank by it". Mirrors resolutionForRank()'s same "#1 counts
// harder" framing: the #1 priority cuts the pool down hard (keep the top
// ~30%), #2 only trims the weaker half, and anything past that is left
// alone at this stage - by rank 3 a tag is meant as a gentle tiebreaker in
// the ranking below, not something that should be removing phones.
function keepFractionForRank(rank) {
  if (rank === 0) return 0.3;
  if (rank === 1) return 0.5;
  return null;
}

// Keeps only the top keepFractionForRank(rank) of `pool` on `tag` (by raw
// value, not the ranking's bucketed grade - elimination wants an exact
// percentile cut, not a coarse tie-friendly one) - but only if that still
// leaves at least MIN_POOL_SIZE candidates; otherwise the pool is left
// untouched for this tag. This is what makes a stated priority actually
// ELIMINATE phones from the pool (not just re-rank them, as tags alone did
// before), while still applying the same relax-rather-than-omit safety net
// already used for producent and release_year below - a thin tier/brand
// slice just won't narrow further once it's already close to the floor.
function narrowByTag(pool, tag, profile, rank) {
  const fraction = keepFractionForRank(rank);
  if (fraction === null) return pool;

  const getValue = valueGetter(tag, profile);
  const sorted = [...pool].sort((a, b) => getValue(b.specs) - getValue(a.specs));
  const keepCount = Math.min(sorted.length, Math.max(MIN_POOL_SIZE, Math.ceil(pool.length * fraction)));
  const filtered = sorted.slice(0, keepCount);
  return filtered.length >= MIN_POOL_SIZE ? filtered : pool;
}

// Every hard filter/elimination step the verdict actually applies, in
// order: producent, then recency, then each stated priority tag in turn -
// #1 first (cutting hardest), then #2, each guarded by MIN_POOL_SIZE; #3+
// only ranks, per keepFractionForRank() above. Exported so the test
// counter can show the exact same pool pickBest() is about to rank from,
// not a separate approximation of it.
// Recency is a hard filter, but not a guaranteed-safe one like producent
// below - a tier/brand slice can legitimately have nothing released in the
// last two years, so this only narrows when doing so leaves at least one
// candidate; otherwise the input is returned unchanged rather than ever
// emptying it. Split out from narrowPool() so findOtherBrandPicks() below
// can apply the exact same recency window to the WHOLE tier (every
// selected brand, not just the winner's) without duplicating this logic.
function applyRecencyFilter(candidates) {
  const minYear = minVerdictReleaseYear();
  const recentMatches = candidates.filter((c) => Number(c.release_year) >= minYear);
  return recentMatches.length > 0 ? recentMatches : candidates;
}

export function narrowPool(candidates, profile) {
  // A concrete producent choice (up to MAX_PRODUCENT brands, see
  // lib/wizardTree.js) is a hard filter, not a ranking bonus -
  // lib/wizardBrands.js only ever offers a producent the catalog actually
  // carries in this price tier, so this can't legitimately empty the pool.
  // Kept defensive anyway (fall back to the unfiltered candidates rather
  // than ever returning null for an answered path) in case that guarantee
  // is ever violated by stale/edited data.
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

// Human-readable reason text per tag, used only by findOtherBrandPicks()
// below - "znacznie" (significantly) matches the MIN_BETTER_MARGIN gate,
// which only fires for a real, not-marginal difference.
const BETTER_DIMENSION_LABELS = {
  bateria: "znacznie większa bateria",
  aparat: "znacznie mocniejszy aparat",
  wydajnosc: "znacznie wydajniejszy chipset",
  jakosc_ekranu: "znacznie lepszy ekran",
};

// A candidate only counts as meaningfully better on a dimension past this
// relative margin over the winner - avoids calling a 3% battery gap
// "lepiej", which would cheapen the label everywhere else it's used.
const MIN_BETTER_MARGIN = 0.15;

// Picks whichever of the four spec dimensions shows the largest relative
// improvement over `winner` for `candidate`, if any clears
// MIN_BETTER_MARGIN - deliberately checks ALL four, not just the ones the
// user actually prioritized (profile.tags), because the point here is
// surfacing something the wizard's own ranking wouldn't have told them
// about otherwise (e.g. a much bigger battery on a brand they didn't end
// up with, even if they never asked about battery).
function findBetterDimension(candidate, winner) {
  let bestTag = null;
  let bestMargin = MIN_BETTER_MARGIN;
  for (const tag of ["bateria", "aparat", "wydajnosc", "jakosc_ekranu"]) {
    const candValue = tagValue(tag, candidate.specs);
    const winnerValue = tagValue(tag, winner.specs);
    if (winnerValue <= 0) continue;
    const margin = (candValue - winnerValue) / winnerValue;
    if (margin > bestMargin) {
      bestMargin = margin;
      bestTag = tag;
    }
  }
  return bestTag;
}

// Only meaningful when the wizard's own producent choice covered more than
// one brand: for each OTHER selected brand (not the one that won), finds
// that brand's own best match under the SAME profile/ranking, and - if it
// turns out cheaper, or clearly better on some spec dimension - surfaces it
// using the same Taniej/Lepiej framing already used everywhere else in the
// app (lib/angles.js, components/AlternativeCard.js), computed live from
// THIS wizard session rather than the generic per-product cache
// (lib/matching.js's product_alternatives). A brand that has nothing
// cheaper or clearly better is simply left out - never forced in just to
// fill a slot. "Inaczej" is deliberately not replicated here; it's about
// niche-brand discovery, not a same-tier brand comparison, and stays only
// on the generic alternatives the product page already shows.
function findOtherBrandPicks(recentPool, profile, winner) {
  if (!Array.isArray(profile.producent) || profile.producent.length < 2) return [];

  const otherBrands = profile.producent.filter((b) => b !== winner.brand);
  const picks = [];

  for (const brand of otherBrands) {
    if (picks.length >= 2) break;

    const brandPool = recentPool.filter((c) => c.brand === brand);
    if (brandPool.length === 0) continue;

    const altBest = pickBest(brandPool, profile);
    if (!altBest || altBest.id === winner.id) continue;

    const winnerPrice = parsePriceLow(winner.specs);
    const altPrice = parsePriceLow(altBest.specs);

    if (winnerPrice != null && altPrice != null && altPrice < winnerPrice) {
      picks.push({
        comparison_angle: "tansza",
        slug: altBest.slug,
        name: altBest.name,
        score: altBest.score,
        price_pln_approx: altBest.specs?.price_pln_approx,
        reason: `Tańsza opcja od ${brand}, wciąż dobrze dopasowana do Twoich priorytetów.`,
      });
      continue;
    }

    const betterTag = findBetterDimension(altBest, winner);
    if (betterTag) {
      picks.push({
        comparison_angle: "wyzsza_jakosc",
        slug: altBest.slug,
        name: altBest.name,
        score: altBest.score,
        price_pln_approx: altBest.specs?.price_pln_approx,
        reason: `${brand} - ${BETTER_DIMENSION_LABELS[betterTag]} niż w rekomendowanym modelu.`,
      });
    }
  }

  return picks;
}

export async function matchTelefon(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier, p.price_checked_at, p.release_year
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.price_tier = $1`,
    [profile.budzet]
  );
  const candidates = result.rows;

  const product = pickBest(candidates, profile);
  if (!product) return { product: null, otherBrandPicks: [] };

  const otherBrandPicks = findOtherBrandPicks(applyRecencyFilter(candidates), profile, product);
  return { product, otherBrandPicks };
}

// TEST/temporary (see app/api/wizard-live-count): how many phones the
// wizard's verdict would actually be picking from right now, given
// whatever's answered so far - runs the exact same narrowPool() pickBest()
// is about to rank from, so it never drifts from what the user will really
// see. Before a budget tier is even chosen there's nothing to narrow yet,
// so it just reports the whole telefony catalog. Safe to delete alongside
// the counter route/component once the test is done.
export async function countMatchingPool({ budzet, tags, marka, producent } = {}) {
  const pool = getPool();
  if (!budzet) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE c.slug = 'telefony' AND p.status = 'published'`
    );
    return result.rows[0].count;
  }

  const result = await pool.query(
    `SELECT p.brand, p.specs, p.release_year
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.price_tier = $1`,
    [budzet]
  );

  return narrowPool(result.rows, { tags: tags ?? [], marka, producent }).length;
}
