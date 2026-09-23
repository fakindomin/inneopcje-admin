import { getPool } from "./db.js";
import { minVerdictReleaseYear } from "./wizardMatch.js";

// Below this spread, "kompaktowy" and "duży ekran" describe the same
// handful of nearly-identical phones - asking the question would let a user
// pick either answer and always land on the same result, silently lying
// about the choice mattering. 0.5" is comfortably above rounding/spec noise
// but well below a real compact-vs-large gap (the catalog's typical spread
// across a whole tier is 1"+).
const MIN_MEANINGFUL_SPREAD_INCHES = 0.5;

// Mirrors lib/wizardBrands.js's getProducentByTier: only asks the wizard's
// "gabaryty" question when the catalog's OWN recent products (the exact
// same release_year window pickBest() hard-filters the verdict to - see
// lib/wizardMatch.js) actually span a real size range in that price tier.
// A tier whose recent lineup is all much-of-a-muchness (e.g. today's
// budżetowy: nothing but ~6.7" phones) skips the question entirely rather
// than asking it for show.
export async function hasMeaningfulScreenRangeByTier() {
  const pool = getPool();
  const minYear = minVerdictReleaseYear();
  const result = await pool.query(
    `SELECT p.price_tier,
            MIN((p.specs->>'screen_size_inches')::numeric) AS min_size,
            MAX((p.specs->>'screen_size_inches')::numeric) AS max_size
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.release_year >= $1
     GROUP BY p.price_tier`,
    [minYear]
  );

  const byTier = { budzetowy: false, sredni: false, premium: false };
  for (const row of result.rows) {
    if (!(row.price_tier in byTier)) continue;
    const min = Number(row.min_size);
    const max = Number(row.max_size);
    byTier[row.price_tier] = Number.isFinite(min) && Number.isFinite(max) && max - min >= MIN_MEANINGFUL_SPREAD_INCHES;
  }
  return byTier;
}
