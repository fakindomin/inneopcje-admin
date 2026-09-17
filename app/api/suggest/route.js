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
    `SELECT p.name, p.slug, c.slug AS category
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'published'
       AND (p.normalized_name ILIKE '%' || $1 || '%' OR similarity(p.normalized_name, $1) > 0.2)
     ORDER BY similarity(p.normalized_name, $1) DESC, p.name ASC
     LIMIT 6`,
    [q]
  );

  return NextResponse.json(result.rows);
}
