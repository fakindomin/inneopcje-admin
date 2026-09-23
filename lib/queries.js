import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";
import { ANGLE_ORDER } from "./angles.js";

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
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score, p.summary,
            p.pros, p.cons, p.specs, p.price_tier, p.price_checked_at, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1 AND p.status = 'published'`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function getAlternatives(productId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT pa.comparison_angle, pa.reason,
            p.name, p.slug, p.score, p.specs->>'price_pln_approx' AS price_pln_approx
     FROM product_alternatives pa
     JOIN products p ON p.id = pa.alternative_product_id
     WHERE pa.product_id = $1`,
    [productId]
  );

  const byAngle = Object.fromEntries(result.rows.map((row) => [row.comparison_angle, row]));
  return ANGLE_ORDER.map((angle) => byAngle[angle]).filter(Boolean);
}

export async function logSearch(rawQuery) {
  const pool = getPool();
  await pool.query(`INSERT INTO search_logs (raw_query) VALUES ($1)`, [rawQuery]);
}
