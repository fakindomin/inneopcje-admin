import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { fetchLivePricesBatch, generatePricesBatchText } from "../../../../lib/geminiPrice.js";

// Diagnostic only, no writes: the backfill panel ran through 330 reset
// telewizory rows and priced 0 of them, with no way to see why (no log
// access on this token - 403). This calls the batch path directly against
// a handful of real product names and returns BOTH the raw model text and
// the parsed result, so a JSON/schema problem is visible separately from a
// name-matching problem.
export async function GET(request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const n = Number(new URL(request.url).searchParams.get("n")) || 5;
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory'
     ORDER BY p.id
     LIMIT $1`,
    [n]
  );
  const names = rows.map((r) => r.name);

  let raw = null;
  let rawError = null;
  try {
    raw = await generatePricesBatchText(names, process.env.GEMINI_API_KEY_TV);
  } catch (err) {
    rawError = err.message;
  }

  let parsed = null;
  let parsedError = null;
  try {
    const map = await fetchLivePricesBatch(names, { apiKey: process.env.GEMINI_API_KEY_TV });
    parsed = Object.fromEntries(map);
  } catch (err) {
    parsedError = err.message;
  }

  return NextResponse.json({ names, raw, rawError, parsed, parsedError });
}
