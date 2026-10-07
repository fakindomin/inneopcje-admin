import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";
import { ANGLE_ORDER } from "./angles.js";
import { computeAlternatives } from "./matching.js";

export async function searchProducts(rawQuery) {
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return [];

  const pool = getPool();
  const result = await pool.query(
    `SELECT name, slug, brand, price_tier, score, verdict,
            specs->>'price_pln_approx' AS price_pln_approx
     FROM products
     WHERE status = 'published'
       AND (normalized_name ILIKE '%' || $1 || '%' OR similarity(normalized_name, $1) > 0.2)
     ORDER BY similarity(normalized_name, $1) DESC, name ASC
     LIMIT 30`,
    [normalized]
  );

  return result.rows;
}

export async function getProductBySlug(slug) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.category_id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score, p.summary,
            p.pros, p.cons, p.specs, p.price_tier, p.price_checked_at, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1 AND p.status = 'published'`,
    [slug]
  );
  return result.rows[0] ?? null;
}

// `platformy`, when given (the wizard's chosen platform(s), carried forward
// through every "Inne Opcje" hop - see GryWizard.js/AlternativeCard.js),
// computes alternatives LIVE against a candidate pool pre-filtered to games
// sharing at least one of those platforms, instead of reading the
// product_alternatives cache (which is platform-agnostic by design - it's
// shared by every visitor, not scoped to one user's wizard answers). Filtering
// the pool BEFORE picking, rather than filtering the cached picks AFTER, is
// what guarantees every slot is chosen from games the user can actually
// play instead of just going empty when a cached pick doesn't match.
export async function getAlternatives(product, platformy) {
  const pool = getPool();

  if (Array.isArray(platformy) && platformy.length > 0) {
    const { rows: candidates } = await pool.query(
      `SELECT id, slug, name, brand, brand_recognition, score, price_tier, specs
       FROM products
       WHERE category_id = $1 AND status = 'published' AND id <> $2
         AND specs->'platformy' ?| $3::text[]`,
      [product.category_id, product.id, platformy]
    );

    const computed = computeAlternatives(product, candidates);
    const byId = new Map(candidates.map((c) => [c.id, c]));

    const byAngle = {};
    for (const alt of computed) {
      const candidate = byId.get(alt.alternativeId);
      if (!candidate) continue;
      byAngle[alt.angle] = {
        comparison_angle: alt.angle,
        reason: alt.reason,
        name: candidate.name,
        slug: candidate.slug,
        score: candidate.score,
        price_pln_approx: candidate.specs?.price_pln_approx ?? null,
      };
    }
    return ANGLE_ORDER.map((angle) => byAngle[angle]).filter(Boolean);
  }

  const result = await pool.query(
    `SELECT pa.comparison_angle, pa.reason,
            p.name, p.slug, p.score, p.specs->>'price_pln_approx' AS price_pln_approx
     FROM product_alternatives pa
     JOIN products p ON p.id = pa.alternative_product_id
     WHERE pa.product_id = $1`,
    [product.id]
  );

  const byAngle = Object.fromEntries(result.rows.map((row) => [row.comparison_angle, row]));
  return ANGLE_ORDER.map((angle) => byAngle[angle]).filter(Boolean);
}

export async function logSearch(rawQuery) {
  const pool = getPool();
  await pool.query(`INSERT INTO search_logs (raw_query) VALUES ($1)`, [rawQuery]);
}
