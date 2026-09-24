import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { fetchLivePricesBatch } from "../../../../lib/geminiPrice.js";

// One-time bulk fill for the freshly-imported telewizory catalog (specs
// only, no pricing - see lib/telewizoryMergedImport.js), not the phones'
// per-page-view refresh (app/api/phone/[slug]/price) - that mechanism only
// prices a product once someone actually views it, which would leave most
// of a 400+ row cold import unpriced indefinitely. Client-driven batches
// (see components/TelewizoryPriceBackfillPanel.js) instead of one big loop
// here, to stay well inside a Vercel function's time limit.
export const maxDuration = 60;

// One fetchLivePricesBatch() call prices the whole batch, so this is sized
// by Gemini's per-minute token budget (generous) rather than the per-key
// daily request cap (RPD) that made pricing one product per call the real
// bottleneck - see lib/geminiPrice.js's fetchLivePricesBatch.
const BATCH_SIZE = 50;

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
  if (batch.length > 0) {
    let prices = new Map();
    try {
      prices = await fetchLivePricesBatch(
        batch.map((p) => p.name),
        { apiKey: process.env.GEMINI_API_KEY_TV }
      );
    } catch (err) {
      console.error(`telewizory price backfill batch failed (${batch.length} products):`, err.message);
    }

    const pricedIds = [];
    const pricedValues = [];
    const uncheckedIds = [];
    for (const product of batch) {
      const price = prices.get(product.name) ?? null;
      if (price !== null) {
        pricedIds.push(product.id);
        pricedValues.push(price);
        priced++;
      } else {
        uncheckedIds.push(product.id);
      }
    }

    // Nothing reliable found for uncheckedIds - still stamp
    // price_checked_at so those rows don't get re-picked (and re-spend a
    // call) on every next batch.
    if (pricedIds.length > 0) {
      await pool.query(
        `UPDATE products AS p
         SET specs = specs || jsonb_build_object('price_pln_approx', data.price), price_checked_at = now()
         FROM unnest($1::int[], $2::text[]) AS data(id, price)
         WHERE p.id = data.id`,
        [pricedIds, pricedValues]
      );
    }
    if (uncheckedIds.length > 0) {
      await pool.query(`UPDATE products SET price_checked_at = now() WHERE id = ANY($1::int[])`, [uncheckedIds]);
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
