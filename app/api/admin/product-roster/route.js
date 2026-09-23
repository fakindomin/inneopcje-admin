import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Admin-only export of every published product's identity + current specs
// for one category (default telefony, for back-compat with the original
// bulk specs backfill this was built for), so any research done outside
// this sandbox (no network path to this site) knows exactly what to look
// up and what's already filled in - no point re-researching a field that's
// already set.
export async function GET(request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const category = new URL(request.url).searchParams.get("category") || "telefony";

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.slug, p.name, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.price_tier, p.release_year, p.status,
            p.specs, p.price_checked_at, p.created_at, p.updated_at
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = $1
     ORDER BY p.name`,
    [category]
  );

  return NextResponse.json({ category, total: result.rows.length, products: result.rows });
}
