import { NextResponse } from "next/server";
import { getPool } from "../../../../../lib/db.js";
import { fetchLivePrice } from "../../../../../lib/geminiPrice.js";

// A product's price is trusted for this long before a page view triggers a
// live re-check - see components/VerdictCard.js for the client side of
// this (shows the cached price immediately, only calls this route, with a
// spinner, when it's actually stale). Chosen because retail electronics
// prices don't meaningfully move day to day, so this only spends a Gemini
// call on products someone is actually looking at, roughly once a week.
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request, { params }) {
  const { slug } = await params;
  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT id, name, specs->>'price_pln_approx' AS price_pln_approx, price_checked_at
     FROM products WHERE slug = $1 AND status = 'published'`,
    [slug]
  );
  const product = rows[0];
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isStale =
    !product.price_checked_at || Date.now() - new Date(product.price_checked_at).getTime() > STALE_AFTER_MS;

  if (!isStale) {
    return NextResponse.json({ price_pln_approx: product.price_pln_approx, refreshed: false });
  }

  // Fails soft: a Gemini error (missing key, quota, transient failure)
  // just leaves the existing price in place rather than breaking the page
  // - the next stale view tries again. Either way price_checked_at is
  // bumped, so a model Gemini can never confidently price doesn't retry
  // (and spend a call) on every single view, only once a week like everything
  // else.
  let newPrice = null;
  try {
    newPrice = await fetchLivePrice(product.name);
  } catch (err) {
    console.error(`price refresh failed for "${product.name}" (${slug}):`, err.message);
  }

  const finalPrice = newPrice ?? product.price_pln_approx;
  await pool.query(
    `UPDATE products
     SET specs = specs || jsonb_build_object('price_pln_approx', $2::text), price_checked_at = now()
     WHERE id = $1`,
    [product.id, finalPrice]
  );

  return NextResponse.json({ price_pln_approx: finalPrice, refreshed: newPrice !== null });
}
