import { normalizeBrand } from "./brands.js";

const SCORE_MIN = 1;
const SCORE_MAX = 10;
const VALID_BRAND_RECOGNITION = new Set(["mainstream", "niche"]);
const VALID_PRICE_TIER = new Set(["budzetowy", "sredni", "premium"]);
// A single number or a "low-high" range, no currency symbols or words — the
// alternatives engine (lib/matching.js) parses this to rank by price, so a
// strict contract here means it never has to guess at parse time. Only
// categories that actually track a live PLN price (none currently do) set
// this field at all - gry's specs have no price_pln_approx, so it's
// validated only when present, never required.
const PRICE_FORMAT = /^\d[\d.,]*(-\d[\d.,]*)?$/;

// Validates a hand-edited product from the admin edit form (the only
// remaining caller - the old batch-import-via-Gemini-chat flow and its
// mandatory price/brand-allowlist/release-year-window rules were removed
// along with telefony/telewizory, which were the only categories using
// them).
export function validateProductEdit(data, category) {
  if (!data || typeof data !== "object") return { error: "element nie jest obiektem JSON" };
  if (typeof data.name !== "string" || !data.name.trim()) return { error: "brak pola name" };
  if (typeof data.verdict !== "string" || !data.verdict.trim()) return { error: "brak pola verdict" };

  const score = Number(data.score);
  if (!Number.isFinite(score) || score < SCORE_MIN || score > SCORE_MAX) {
    return { error: "score musi być liczbą 1-10" };
  }
  if (typeof data.summary !== "string" || !data.summary.trim()) return { error: "brak pola summary" };
  if (!Array.isArray(data.pros) || data.pros.length === 0) return { error: "brak pola pros" };
  if (!Array.isArray(data.cons) || data.cons.length === 0) return { error: "brak pola cons" };
  if (!data.specs || typeof data.specs !== "object") return { error: "brak pola specs" };

  const price = typeof data.specs.price_pln_approx === "string" ? data.specs.price_pln_approx.trim() : "";
  if (price && !PRICE_FORMAT.test(price)) {
    return {
      error: `specs.price_pln_approx musi być liczbą lub zakresem liczb (np. "2500-2800"), bez walut/tekstu — otrzymano "${data.specs.price_pln_approx}"`,
    };
  }

  if (typeof data.brand !== "string" || !data.brand.trim()) return { error: "brak pola brand" };
  const canonicalBrand = normalizeBrand(category, data.brand);
  if (!canonicalBrand) return { error: `marka "${data.brand}" jest poza dozwoloną listą dla kategorii "${category}"` };
  if (!VALID_BRAND_RECOGNITION.has(data.brand_recognition)) return { error: "nieprawidłowe brand_recognition" };
  if (!VALID_PRICE_TIER.has(data.price_tier)) return { error: "nieprawidłowe price_tier" };

  const releaseYear = Number(data.release_year);
  if (!Number.isFinite(releaseYear)) return { error: "brak pola release_year" };
  if (releaseYear > new Date().getFullYear() + 1) {
    return { error: `release_year ${releaseYear} jest zbyt odległy w przyszłości` };
  }

  return {
    data: {
      ...data,
      name: data.name.trim(),
      brand: canonicalBrand,
      score,
      release_year: releaseYear,
      specs: price ? { ...data.specs, price_pln_approx: price } : data.specs,
    },
  };
}
