import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// One-off: some raw source files (TV.zip's Hisense/Panasonic batches) used
// an underscore where the real model name has a space (e.g. "43E7NQ_Pro"
// instead of "43E7NQ Pro") - that leaked into products.name for rows the
// merged import inserted fresh (see data/telewizory_merged.json, fixed at
// the source alongside this route so a future re-import doesn't
// regress). slug is untouched (already underscore-free - slugify() runs
// normalizeQuery() first, which strips underscore same as any other
// non-alphanumeric), so no URLs move. Safe to hit more than once - a
// repeat run just matches zero rows.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE products AS p
     SET name = regexp_replace(p.name, '_', ' ', 'g'),
         normalized_name = regexp_replace(p.normalized_name, '_', ' ', 'g'),
         updated_at = now()
     FROM categories c
     WHERE c.id = p.category_id AND c.slug = 'telewizory' AND p.name ~ '_'
     RETURNING p.slug, p.name`
  );

  return NextResponse.json({
    fixed: rows.length,
    products: rows,
  });
}
