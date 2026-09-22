import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Strips a trailing "5G"/"4G" token - the most common source of duplicate
// rows found by eye in the catalog (e.g. "Samsung Galaxy A16" and
// "Samsung Galaxy A16 5G" both present as separate products, sometimes
// with different specs for what's the same phone).
function normalizeNoGeneration(name) {
  return normalize(name).replace(/\s+(5g|4g)$/i, "");
}

// Diagnostic, admin-only: finds products that are very likely the same
// phone listed twice under different slugs - two separate import passes
// over an overlapping scope, with no dedup, produced this. Flags exact
// name matches (e.g. "realme 16 Pro+" appearing twice verbatim, once with
// contradicting specs) separately from "5G/4G suffix" near-matches, since
// the latter needs a human judgment call (sometimes a real distinct SKU).
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.slug, p.name, p.brand, p.price_tier, p.specs
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'
     ORDER BY p.name`
  );

  const rows = result.rows;

  const exactGroups = new Map();
  for (const row of rows) {
    const key = normalize(row.name);
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(row);
  }
  const exactDuplicates = [...exactGroups.values()].filter((g) => g.length > 1);

  const exactSlugs = new Set(exactDuplicates.flatMap((g) => g.map((r) => r.slug)));

  const genGroups = new Map();
  for (const row of rows) {
    if (exactSlugs.has(row.slug)) continue; // already reported as an exact match
    const key = `${row.brand}::${normalizeNoGeneration(row.name)}`;
    if (!genGroups.has(key)) genGroups.set(key, []);
    genGroups.get(key).push(row);
  }
  const generationDuplicates = [...genGroups.values()].filter((g) => g.length > 1);

  const shape = (row) => ({
    slug: row.slug,
    name: row.name,
    price_tier: row.price_tier,
    chipset: row.specs?.chipset ?? null,
    battery_mah: row.specs?.battery_mah ?? null,
    price_pln_approx: row.specs?.price_pln_approx ?? null,
  });

  return NextResponse.json({
    totalProducts: rows.length,
    exactNameDuplicateGroups: exactDuplicates.map((g) => g.map(shape)),
    generationSuffixDuplicateGroups: generationDuplicates.map((g) => g.map(shape)),
  });
}
