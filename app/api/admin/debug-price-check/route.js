import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { fetchLivePrice, generatePriceText } from "../../../../lib/geminiPrice.js";

// Diagnostic only, no writes: calls Gemini for a product's live price the
// same way app/api/phone/[slug]/price/route.js does (same key selection,
// same fetchLivePrice()), but ignores the staleness gate and never touches
// the DB - so it can be used to check "does the checker actually work"
// independent of whether a given product's price_checked_at happens to be
// fresh (which makes the real route a no-op and hides this entirely).
export async function GET(request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "brak ?slug=" }, { status: 400 });

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.name, p.specs->>'price_pln_approx' AS price_pln_approx, p.price_checked_at, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1`,
    [slug]
  );
  const product = rows[0];
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const apiKey = product.category_slug === "telewizory" ? process.env.GEMINI_API_KEY_TV : undefined;
  const keySource = product.category_slug === "telewizory" ? "GEMINI_API_KEY_TV" : "GEMINI_API_KEY";
  const keyPresent = Boolean(apiKey ?? process.env.GEMINI_API_KEY);

  let result = null;
  let error = null;
  const startedAt = Date.now();
  try {
    result = await fetchLivePrice(product.name, { apiKey });
  } catch (err) {
    error = err.message;
  }

  // ?probe=1 tests the primary and fallback keys directly, one at a time,
  // bypassing fetchLivePrice's shared retry - separates "both keys share
  // one exhausted quota" from "the retry logic itself is broken".
  let probe = null;
  if (new URL(request.url).searchParams.get("probe")) {
    probe = {};
    for (const [label, key] of [
      [keySource, apiKey],
      ["GEMINI_API_KEY_FALLBACK", process.env.GEMINI_API_KEY_FALLBACK],
    ]) {
      if (label === "GEMINI_API_KEY_FALLBACK" && !key) {
        probe[label] = { present: false };
        continue;
      }
      try {
        probe[label] = { present: true, result: await generatePriceText(product.name, key) };
      } catch (err) {
        probe[label] = { present: true, error: err.message };
      }
    }
  }

  return NextResponse.json({
    slug,
    name: product.name,
    category: product.category_slug,
    keySource,
    keyPresent,
    currentDbPrice: product.price_pln_approx,
    currentPriceCheckedAt: product.price_checked_at,
    geminiResult: result,
    geminiError: error,
    tookMs: Date.now() - startedAt,
    probe,
  });
}
