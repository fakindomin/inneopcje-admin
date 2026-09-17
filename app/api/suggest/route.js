import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import { normalizeQuery } from "../../../lib/normalize";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = normalizeQuery(searchParams.get("q") || "");

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT name, slug
     FROM products
     WHERE status = 'published'
       AND (normalized_name ILIKE '%' || $1 || '%' OR similarity(normalized_name, $1) > 0.2)
     ORDER BY similarity(normalized_name, $1) DESC, name ASC
     LIMIT 6`,
    [q]
  );

  return NextResponse.json(result.rows);
}
