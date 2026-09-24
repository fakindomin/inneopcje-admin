import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// One-off: telewizory-price-backfill only ever picks rows where
// price_checked_at IS NULL, and it stamps that column even when it found
// no reliable price (so a repeatedly-failing product doesn't get re-tried,
// and re-spend a call, on every single batch). That's exactly what
// happened during today's Gemini outage - every row got stamped with no
// real price, so the backfill panel now shows "Gotowe" with nothing left
// to do, even though the underlying fix (gemini-3.6-flash, batched calls)
// is live. This clears price_checked_at for telewizory rows still missing
// a real price, so the backfill panel picks them back up.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE products AS p
     SET price_checked_at = NULL
     FROM categories c
     WHERE c.id = p.category_id AND c.slug = 'telewizory' AND p.specs->>'price_pln_approx' IS NULL
     RETURNING p.slug`
  );

  return NextResponse.json({ reset: rows.length });
}
