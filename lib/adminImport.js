import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";
import { computeAlternatives } from "./matching.js";

function slugify(name) {
  return normalizeQuery(name).replace(/\s+/g, "-");
}

async function uniqueSlug(pool, baseSlug) {
  const { rows } = await pool.query(`SELECT slug FROM products WHERE slug = $1 OR slug LIKE $1 || '-%'`, [baseSlug]);
  if (rows.length === 0) return baseSlug;

  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(baseSlug)) return baseSlug;

  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

export async function getCategoryIdBySlug(slug) {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT id FROM categories WHERE slug = $1`, [slug]);
  return rows[0]?.id ?? null;
}

export async function insertManualProduct(categoryId, name, evaluation, status) {
  const pool = getPool();
  const normalizedName = normalizeQuery(name);
  const slug = await uniqueSlug(pool, slugify(name));
  const score = Number(evaluation.score).toFixed(1);

  const { rows } = await pool.query(
    `INSERT INTO products
       (category_id, name, slug, normalized_name, brand, brand_recognition, verdict, score,
        summary, pros, cons, specs, price_tier, release_year, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15)
     RETURNING id, slug, name, brand, brand_recognition, score, price_tier, specs`,
    [
      categoryId,
      name,
      slug,
      normalizedName,
      evaluation.brand,
      evaluation.brand_recognition,
      evaluation.verdict,
      score,
      evaluation.summary,
      JSON.stringify(evaluation.pros),
      JSON.stringify(evaluation.cons),
      JSON.stringify(evaluation.specs),
      evaluation.price_tier,
      evaluation.release_year,
      status,
    ]
  );
  return rows[0];
}

export async function linkManualAlternatives(categoryId, product) {
  const pool = getPool();
  const { rows: candidates } = await pool.query(
    `SELECT id, slug, name, brand, brand_recognition, score, price_tier, specs
     FROM products WHERE category_id = $1 AND status = 'published' AND id <> $2`,
    [categoryId, product.id]
  );

  const alternatives = computeAlternatives(product, candidates);
  for (const alt of alternatives) {
    await pool.query(
      `INSERT INTO product_alternatives (product_id, alternative_product_id, comparison_angle, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, alternative_product_id, comparison_angle) DO NOTHING`,
      [product.id, alt.alternativeId, alt.angle, alt.reason]
    );
  }
  return alternatives.length;
}
