// Alternative-matching engine — see the memory note on this audit for the
// full rationale. Core rules:
//   - "Taniej" ranks by price (falling back to tier/score only when price
//     can't be parsed). "Lepiej" ranks by score — a higher price is not the
//     same thing as higher quality.
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

// Picks the closest higher-scoring candidate — quality, not price.
function pickHigherScore(base, pool) {
  const baseScore = Number(base.score);
  const matches = pool.filter((c) => Number(c.score) > baseScore);
  if (matches.length === 0) return null;
  matches.sort((a, b) => Number(a.score) - Number(b.score));
  return matches[0];
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
  let different = pickClosestScore(base, available().filter((c) => c.brand_recognition === wantRecognition));
  let reason = different
    ? wantRecognition === "niche"
      ? `Mniej znana w Polsce marka (${different.brand}), porównywalny poziom jakości`
      : `Bardziej rozpoznawalna marka (${different.brand}), porównywalny poziom jakości`
    : null;
  if (!different) {
    // Category only has one brand-recognition tier — neutral fallback
    // instead of pretending a recognition contrast that doesn't exist.
    different = pickClosestScore(base, otherBrand());
    reason = different ? `Inna marka (${different.brand}), porównywalny poziom jakości` : null;
  }
  if (different) {
    results.push({ angle: "niszowa_marka", alternativeId: different.id, reason });
  }

  return results;
}
