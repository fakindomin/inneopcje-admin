import { normalizeBrand } from "./brands.js";
import { minAllowedReleaseYear } from "./importPrompt.js";

const SCORE_MIN = 1;
const SCORE_MAX = 10;
const VALID_BRAND_RECOGNITION = new Set(["mainstream", "niche"]);
const VALID_PRICE_TIER = new Set(["budzetowy", "sredni", "premium"]);
const VALID_CONFIDENCE = new Set(["wysoka", "niska"]);
// A single number or a "low-high" range, no currency symbols or words — the
// alternatives engine (lib/matching.js) parses this to rank by price, so a
// strict contract here means it never has to guess at parse time.
const PRICE_FORMAT = /^\d[\d.,]*(-\d[\d.,]*)?$/;

// Validates a pasted Gemini-chat JSON answer against the same shape the
// (now-disabled) bot expected, plus the release_year window. Returns
// { data } with a normalized brand + numeric fields on success, or
// { error } with a human-readable Polish message to show in the admin form.
export function validateImportPayload(data, category) {
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
  if (!price) return { error: "brak specs.price_pln_approx" };
  if (!PRICE_FORMAT.test(price)) {
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
  const minYear = minAllowedReleaseYear();
  if (!Number.isFinite(releaseYear)) return { error: "brak pola release_year" };
  if (releaseYear < minYear) return { error: `release_year ${releaseYear} jest starszy niż dozwolone okno (${minYear}+)` };
  if (releaseYear > new Date().getFullYear() + 1) {
    return { error: `release_year ${releaseYear} jest zbyt odległy w przyszłości` };
  }
  if (!VALID_CONFIDENCE.has(data.confidence)) return { error: "nieprawidłowe confidence" };

  return {
    data: {
      ...data,
      name: data.name.trim(),
      brand: canonicalBrand,
      score,
      release_year: releaseYear,
      specs: { ...data.specs, price_pln_approx: price },
    },
  };
}
