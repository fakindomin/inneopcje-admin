import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Diagnostic, admin-only: every distinct `specs.chipset` string in the
// catalog, how many products use it, and any `chipset_tier` already set
// for it (mostly the original 26 hand-curated products) - the ground
// truth a name -> tier classifier needs, since guessing tiers for chipset
// names never seen is exactly the kind of thing this project keeps
// finding broken when it isn't measured first.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.specs->>'chipset' AS chipset, p.specs->>'chipset_tier' AS chipset_tier, p.price_tier
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'`
  );

  const byChipset = new Map();
  for (const row of result.rows) {
    const name = row.chipset || "(brak)";
    if (!byChipset.has(name)) byChipset.set(name, { count: 0, tiersSeen: new Set(), priceTiers: new Set() });
    const entry = byChipset.get(name);
    entry.count++;
    if (row.chipset_tier) entry.tiersSeen.add(row.chipset_tier);
    if (row.price_tier) entry.priceTiers.add(row.price_tier);
  }

  const chipsets = [...byChipset.entries()]
    .map(([chipset, entry]) => ({
      chipset,
      count: entry.count,
      existingTier: entry.tiersSeen.size ? [...entry.tiersSeen] : null,
      seenInPriceTiers: [...entry.priceTiers],
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ totalDistinctChipsets: chipsets.length, chipsets });
}
