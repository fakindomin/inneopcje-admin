import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { fetchLivePrice } from "../../../../lib/geminiPrice.js";

// One-time bulk fill for the freshly-imported telewizory catalog (specs
// only, no pricing - see lib/telewizoryMergedImport.js), not the phones'
// per-page-view refresh (app/api/phone/[slug]/price) - that mechanism only
// prices a product once someone actually views it, which would leave most
// of a 400+ row cold import unpriced indefinitely. Client-driven batches
// (see components/TelewizoryPriceBackfillPanel.js) instead of one big loop
// here, to stay well inside a Vercel function's time limit.
export const maxDuration = 60;

const BATCH_SIZE = 10;

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();

  const { rows: batch } = await pool.query(
    `SELECT p.id, p.name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory' AND p.price_checked_at IS NULL
     ORDER BY p.id
     LIMIT $1`,
    [BATCH_SIZE]
  );

  let priced = 0;
  for (const product of batch) {
    let newPrice = null;
    try {
      newPrice = await fetchLivePrice(product.name, { apiKey: process.env.GEMINI_API_KEY_TV });
    } catch (err) {
      console.error(`telewizory price backfill failed for "${product.name}" (id ${product.id}):`, err.message);
    }

    if (newPrice !== null) {
      await pool.query(
        `UPDATE products
         SET specs = specs || jsonb_build_object('price_pln_approx', $2::text), price_checked_at = now()
         WHERE id = $1`,
        [product.id, newPrice]
      );
      priced++;
    } else {
      // Nothing reliable found - still stamp price_checked_at so this row
      // doesn't get re-picked (and re-spend a call) on every next batch.
      await pool.query(`UPDATE products SET price_checked_at = now() WHERE id = $1`, [product.id]);
    }
  }

  const { rows: remainingRows } = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory' AND p.price_checked_at IS NULL`
  );

  return NextResponse.json({
    processed: batch.length,
    priced,
    remaining: remainingRows[0].n,
  });
}
