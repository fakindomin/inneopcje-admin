import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";

export async function listProducts({ status = "all", category = "all" } = {}) {
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

export async function listFailedQueue() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, category, product_name, last_error, created_at
       FROM seed_queue WHERE status = 'failed'
       ORDER BY created_at DESC`
    );
    return rows;
  } catch (err) {
    // seed_queue is owned by the innaopcja-bot repo and only exists once it
    // has run at least once against this database (42P01), and last_error is
    // a newer column that only exists once it's run since that change (42703).
    if (err.code === "42P01") return [];
    if (err.code === "42703") {
      const { rows } = await pool.query(
        `SELECT id, category, product_name, created_at FROM seed_queue WHERE status = 'failed' ORDER BY created_at DESC`
      );
      return rows.map((r) => ({ ...r, last_error: null }));
    }
    throw err;
  }
}

export async function resetQueueItem(id) {
  const pool = getPool();
  await pool.query(`UPDATE seed_queue SET status = 'pending' WHERE id = $1`, [id]);
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

// bot_state/bot_runs are owned by the innaopcja-bot repo and only exist once
// it has run at least once against this database — every reader here falls
// back to a safe default instead of erroring if the tables aren't there yet.
export async function getBotEnabled() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT value FROM bot_state WHERE key = 'enabled'`);
    return rows[0]?.value !== "false";
  } catch (err) {
    if (err.code === "42P01") return true;
    throw err;
  }
}

export async function setBotEnabled(enabled) {
  const pool = getPool();
  // bot_state is normally created by innaopcja-bot's ensureSchema(), but the
  // panel shouldn't be unable to pause a bot that hasn't run yet.
  await pool.query(`CREATE TABLE IF NOT EXISTS bot_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await pool.query(
    `INSERT INTO bot_state (key, value) VALUES ('enabled', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [enabled ? "true" : "false"]
  );
}

export async function listRecentRuns(limit = 15) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, category, status, published_count, draft_count, failed_count, note, started_at, finished_at
       FROM bot_runs ORDER BY started_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

// Rough estimate of today's Gemini calls: one per product evaluated
// (published/draft/failed) plus ~1 per run for the seed-name generation
// call. Retried transient errors aren't counted, so this undercounts a
// little — it's meant to give a sense of "am I close to the wall", not an
// exact figure (check aistudio.google.com/rate-limit for the real number).
export async function getTodayRequestEstimate() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT published_count, draft_count, failed_count
       FROM bot_runs WHERE started_at >= date_trunc('day', now()) AND status <> 'skipped'`
    );
    return rows.reduce((sum, r) => sum + r.published_count + r.draft_count + r.failed_count + 1, 0);
  } catch (err) {
    if (err.code === "42P01") return 0;
    throw err;
  }
}

export async function getQueueDepth() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT category, status, COUNT(*) AS n FROM seed_queue GROUP BY category, status ORDER BY category, status`
    );
    const byCategory = {};
    for (const row of rows) {
      byCategory[row.category] ??= { pending: 0, done: 0, failed: 0 };
      byCategory[row.category][row.status] = Number(row.n);
    }
    return byCategory;
  } catch (err) {
    if (err.code === "42P01") return {};
    throw err;
  }
}
