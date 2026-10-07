import { getPool } from "./db.js";

export async function listProducts({ status = "all", q = "" } = {}) {
  const pool = getPool();
  const conditions = [];
  const params = [];

  if (status !== "all") {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const trimmedQ = q.trim();
  if (trimmedQ) {
    params.push(`%${trimmedQ}%`);
    conditions.push(`(name ILIKE $${params.length} OR brand ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT id, name, slug, brand, verdict, score, summary, price_tier, status, created_at
     FROM products
     ${where}
     ORDER BY created_at DESC`,
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
