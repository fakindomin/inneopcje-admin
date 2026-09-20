import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Diagnostic, admin-only: what keys actually exist in `specs` across the
// real catalog, and how consistently they're populated. Built after
// finding a bulk-imported phone with no `chipset_tier` at all (only
// `chipset` as a free-text name) - the wizard's "wydajność" grading reads
// chipset_tier directly and treats it as 0 (worst possible) when absent,
// so this answers, precisely, how widespread that gap is, and whether any
// field exists that could back a real "screen quality" priority.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.specs, p.price_tier
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'`
  );

  const rows = result.rows;
  const total = rows.length;

  const keyStats = new Map(); // key -> { present, samples: Set }
  for (const row of rows) {
    const specs = row.specs || {};
    for (const key of Object.keys(specs)) {
      if (specs[key] === null || specs[key] === undefined || specs[key] === "") continue;
      if (!keyStats.has(key)) keyStats.set(key, { present: 0, samples: new Set() });
      const stat = keyStats.get(key);
      stat.present++;
      if (stat.samples.size < 5) stat.samples.add(JSON.stringify(specs[key]));
    }
  }

  const keys = [...keyStats.entries()]
    .map(([key, stat]) => ({
      key,
      present: stat.present,
      missing: total - stat.present,
      coveragePct: total ? Math.round((stat.present / total) * 1000) / 10 : 0,
      samples: [...stat.samples],
    }))
    .sort((a, b) => b.present - a.present);

  return NextResponse.json({ totalProducts: total, keys });
}
