import { getPool } from "./db.js";

// The wizard's "który producent" step only offers a brand as a concrete
// option when the catalog actually carries one in that price tier - drawn
// live from the database instead of a fixed list, so it never dangles an
// option a segment simply doesn't have (e.g. Apple in budzetowy, Xiaomi
// outside premium) and never needs manual upkeep as the catalog changes.
// Only mainstream-recognition brands are offered by name, matching the
// question's own premise ("wolę sprawdzone, znane marki") - niche brands
// are reached through the earlier marka="niszowa"/"obojetnie" answers
// instead, never mixed into this list.
export async function getProducentByTier() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT p.price_tier, p.brand
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.brand_recognition = 'mainstream'`
  );

  const byTier = { budzetowy: [], sredni: [], premium: [] };
  for (const row of result.rows) {
    if (byTier[row.price_tier]) byTier[row.price_tier].push(row.brand);
  }
  for (const tier of Object.keys(byTier)) byTier[tier].sort();
  return byTier;
}
