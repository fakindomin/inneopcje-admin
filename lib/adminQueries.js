import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";

export async function listProducts({ status = "all", category = "all", q = "" } = {}) {
  const pool = getPool();
  const conditions = [];
  const params = [];

  if (status !== "all") {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (category !== "all") {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  const trimmedQ = q.trim();
  if (trimmedQ) {
    params.push(`%${trimmedQ}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.verdict, p.score, p.summary,
            p.price_tier, p.status, p.created_at, c.slug AS category
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

export async function getProductById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.brand, p.brand_recognition, p.verdict, p.score, p.summary,
            p.pros, p.cons, p.specs, p.price_tier, p.release_year, p.status,
            c.slug AS category_slug, c.name AS category_name
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getStatusCounts() {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT status, COUNT(*) AS n FROM products GROUP BY status`);
  const counts = { published: 0, draft: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.n);
  }
  return counts;
}

export async function setProductStatus(id, status) {
  const pool = getPool();
  await pool.query(`UPDATE products SET status = $1, updated_at = now() WHERE id = $2`, [status, id]);
}

export async function deleteProduct(id) {
  const pool = getPool();
  await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
}

export async function listCategories() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, name, slug FROM categories WHERE parent_id IS NULL ORDER BY name`
  );
  return rows;
}

// The alternatives engine needs at least 4 published products in a category
// (the base + 3 distinct picks) to have a shot at filling all 3 comparison
// slots honestly — below that it's not a bug, just not enough data yet.
// Surfacing the count here lets the admin panel flag it instead of someone
// noticing only when a product page looks thin.
export const MIN_PUBLISHED_FOR_FULL_ALTERNATIVES = 4;

export async function getCategoryPublishedCounts() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT c.slug, c.name, COUNT(p.id) FILTER (WHERE p.status = 'published') AS published_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     WHERE c.parent_id IS NULL
     GROUP BY c.slug, c.name
     ORDER BY c.name`
  );
  return rows.map((r) => ({ slug: r.slug, name: r.name, publishedCount: Number(r.published_count) }));
}

export async function addCategory(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Nazwa kategorii jest wymagana");

  const slug = normalizeQuery(trimmed).replace(/\s+/g, "-");
  if (!slug) throw new Error("Nie udało się wygenerować adresu (slug) z tej nazwy");

  const pool = getPool();
  await pool.query(
    `INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, NULL)
     ON CONFLICT (slug) DO NOTHING`,
    [trimmed, slug]
  );
}
