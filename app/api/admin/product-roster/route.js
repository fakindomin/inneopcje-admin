import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Admin-only export of every published telefon's identity + current specs,
// so a bulk specs backfill (researched outside this sandbox, since it has
// no network path to this site) knows exactly what to look up and what's
// already filled in - no point re-researching a field that's already set.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.slug, p.name, p.brand, p.price_tier, p.release_year, p.specs
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'
     ORDER BY p.name`
  );

  return NextResponse.json({ total: result.rows.length, products: result.rows });
}
