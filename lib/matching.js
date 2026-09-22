// Alternative-matching engine — see the memory note on this audit for the
// full rationale. Core rules:
//   - "Taniej" ranks by price (falling back to tier/score only when price
//     can't be parsed). "Lepiej" ranks by score — a higher price is not the
//     same thing as higher quality.
//   - `score` is a price-to-quality-ratio rating (a cheap phone can score
//     well purely for being good value), NOT an absolute quality rating —
//     so "Lepiej" additionally requires the candidate to be in the same
//     price_tier as base, and only reaches one tier higher when nothing in
//     base's own tier out-scores it. Without that gate, a budget phone with
//     a great value score could get labeled "better" than a flagship it
//     isn't actually better than; without the one-tier cap, "Lepiej" could
//     jump straight from budzetowy to premium in one hop, which is exactly
//     the kind of false claim this engine exists to avoid. "Inaczej"
//     similarly requires the SAME tier, since its reason text explicitly
//     claims "porównywalny poziom jakości" (comparable quality) — that's
//     only true within one segment.
//   - Both prefer a different brand, but fall back to the same brand rather
//     than leaving a slot empty — a missing slot is only acceptable when no
//     honest candidate exists at all (nothing in the category is actually
//     cheaper/better/different).
//   - "Inaczej" always points to the *opposite* brand-recognition tier from
//     the base (mainstream -> niche, niche -> mainstream) — "different" is
//     relative to the base, not "more obscure than the base."
//   - Every relaxation level has its own reason text that matches what's
//     actually true; we never claim "cheaper"/"better" when a slot was only
//     filled by loosening the brand constraint.
const TIER_ORDER = { budzetowy: 1, sredni: 2, premium: 3 };

function isSameTier(base, candidate) {
  const baseTier = TIER_ORDER[base.price_tier] ?? null;
  const candTier = TIER_ORDER[candidate.price_tier] ?? null;
  if (baseTier == null || candTier == null) return true;
  return candTier === baseTier;
}

export function parsePriceLow(specs) {
  const raw = specs?.price_pln_approx;
  if (typeof raw !== "string") return null;
  const match = raw.replace(/\s/g, "").match(/(\d[\d,.]*)/);
  if (!match) return null;
  const num = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function isCheaperThanBase(base, basePrice, baseTier, candidate) {
  const price = parsePriceLow(candidate.specs);
  if (basePrice != null && price != null) return price < basePrice;
  const tier = TIER_ORDER[candidate.price_tier] ?? null;
  if (baseTier != null && tier != null) return tier < baseTier;
  return Number(candidate.score) < Number(base.score);
}

// Picks the closest cheaper candidate (highest price/tier that's still below
// base), not just any cheaper one.
function pickCheaper(base, pool) {
  const basePrice = parsePriceLow(base.specs);
  const baseTier = TIER_ORDER[base.price_tier] ?? null;
  const matches = pool.filter((c) => isCheaperThanBase(base, basePrice, baseTier, c));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    if (basePrice != null) return (parsePriceLow(b.specs) ?? -Infinity) - (parsePriceLow(a.specs) ?? -Infinity);
    return (TIER_ORDER[b.price_tier] ?? 0) - (TIER_ORDER[a.price_tier] ?? 0);
  });
  return matches[0];
}

// Picks the closest higher-scoring candidate, preferring base's own price
// tier and only reaching one tier higher when nothing there out-scores it
// — score alone isn't enough (it's a value-for-money rating, so a cheaper
// tier can out-score a pricier one on value without being "better"), and
// an uncapped tier search could jump straight from budzetowy to premium.
function pickHigherScore(base, pool) {
  const baseScore = Number(base.score);
  const baseTier = TIER_ORDER[base.price_tier] ?? null;

  const higherScoring = (tierPredicate) =>
    pool.filter((c) => tierPredicate(TIER_ORDER[c.price_tier] ?? null) && Number(c.score) > baseScore);

  const bestOf = (matches) => {
    if (matches.length === 0) return null;
    matches.sort((a, b) => Number(a.score) - Number(b.score));
    return matches[0];
  };

  if (baseTier == null) {
    // Tier unknown for base - fall back to the old, tier-agnostic search
    // rather than refusing to match at all.
    return bestOf(higherScoring(() => true));
  }

  const sameTier = bestOf(higherScoring((t) => t === baseTier));
  if (sameTier) return sameTier;

  return bestOf(higherScoring((t) => t === baseTier + 1));
}

function pickClosestScore(base, pool) {
  if (pool.length === 0) return null;
  const baseScore = Number(base.score);
  return [...pool].sort(
    (a, b) => Math.abs(Number(a.score) - baseScore) - Math.abs(Number(b.score) - baseScore)
  )[0];
}

function buildCheaperReason(candidate, sameBrand) {
  const price = parsePriceLow(candidate.specs);
  const priceNote = price != null ? ` (ok. ${price} zł)` : "";
  return sameBrand ? `Tańszy model tej samej marki${priceNote}` : `Niższa cena w podobnym segmencie${priceNote}`;
}

function buildBetterReason(base, candidate, sameBrand) {
  return sameBrand
    ? `Wyżej oceniany model tej samej marki (ocena ${candidate.score} vs ${base.score})`
    : `Wyżej oceniany model (ocena ${candidate.score} vs ${base.score})`;
}

// Computes up to 3 outgoing alternative slots for `base` from `candidates`
// (already-published products in the same category, excluding base itself).
// Fills every slot it honestly can — same brand is an acceptable fallback,
// a fabricated claim is not.
export function computeAlternatives(base, candidates) {
  const results = [];
  const used = new Set();
  const available = () => candidates.filter((c) => c.id !== base.id && !used.has(c.id));
  const otherBrand = () => available().filter((c) => c.brand !== base.brand);

  let cheaper = pickCheaper(base, otherBrand());
  let cheaperSameBrand = false;
  if (!cheaper) {
    cheaper = pickCheaper(base, available());
    cheaperSameBrand = true;
  }
  if (cheaper) {
    results.push({ angle: "tansza", alternativeId: cheaper.id, reason: buildCheaperReason(cheaper, cheaperSameBrand) });
    used.add(cheaper.id);
  }

  let better = pickHigherScore(base, otherBrand());
  let betterSameBrand = false;
  if (!better) {
    better = pickHigherScore(base, available());
    betterSameBrand = true;
  }
  if (better) {
    results.push({
      angle: "wyzsza_jakosc",
      alternativeId: better.id,
      reason: buildBetterReason(base, better, betterSameBrand),
    });
    used.add(better.id);
  }

  const wantRecognition = base.brand_recognition === "mainstream" ? "niche" : "mainstream";
  let different = pickClosestScore(
    base,
    available().filter((c) => c.brand_recognition === wantRecognition && isSameTier(base, c))
  );
  let reason = different
    ? wantRecognition === "niche"
      ? `Mniej znana w Polsce marka (${different.brand}), porównywalny poziom jakości`
      : `Bardziej rozpoznawalna marka (${different.brand}), porównywalny poziom jakości`
    : null;
  if (!different) {
    // Category only has one brand-recognition tier at this price point —
    // neutral fallback instead of pretending a recognition contrast that
    // doesn't exist. Still same-tier only: "porównywalny poziom jakości"
    // isn't true across price segments.
    different = pickClosestScore(base, otherBrand().filter((c) => isSameTier(base, c)));
    reason = different ? `Inna marka (${different.brand}), porównywalny poziom jakości` : null;
  }
  if (different) {
    results.push({ angle: "niszowa_marka", alternativeId: different.id, reason });
  }

  return results;
}
