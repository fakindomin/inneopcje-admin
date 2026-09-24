import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Admin-only: published products with no verdict yet in the given category
// - the entries a merged-import (lib/telefonyMergedImport.js,
// lib/telewizoryMergedImport.js) inserted fresh, which carry real specs but
// no editorial copy. Returns just enough to match each row back to its
// data/*_merged.json entry by name and target it with a patch. Defaults to
// telefony for back-compat with the original telefony-only route.
export async function GET(request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const category = new URL(request.url).searchParams.get("category") || "telefony";

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.slug, p.name, p.brand, p.price_tier, p.score
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = $1 AND p.status = 'published'
       AND (p.verdict IS NULL OR p.verdict = '')
     ORDER BY p.name`,
    [category]
  );

  return NextResponse.json({ total: rows.length, products: rows });
}
