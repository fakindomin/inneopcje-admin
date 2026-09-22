import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Admin-only: published telefony products with no verdict yet - the
// entries the telefony_merged.json import inserted fresh (see
// lib/telefonyMergedImport.js), which carry real specs but no editorial
// copy. Returns just enough to match each row back to its
// data/telefony_merged.json entry by name and target it with a patch.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.slug, p.name, p.brand, p.price_tier, p.score
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'
       AND (p.verdict IS NULL OR p.verdict = '')
     ORDER BY p.name`
  );

  return NextResponse.json({ total: rows.length, products: rows });
}
