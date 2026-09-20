import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { resolvePath } from "../../../../lib/wizardTree.js";
import { pickBest } from "../../../../lib/wizardMatch.js";
import { getProducentByTier } from "../../../../lib/wizardBrands.js";

// Diagnostic, admin-only: how much of the actual catalog can the wizard
// ever surface as a result? Walks every reachable answer path and tallies,
// per price tier, which products ever come out on top - a phone that never
// wins under any combination of answers is effectively invisible to the
// wizard, no matter how large the catalog is overall.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dbPool = getPool();
  const result = await dbPool.query(
    `SELECT p.id, p.name, p.brand, p.brand_recognition, p.score, p.price_tier, p.specs
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'`
  );

  const byTier = { budzetowy: [], sredni: [], premium: [] };
  for (const row of result.rows) {
    if (byTier[row.price_tier]) byTier[row.price_tier].push(row);
  }

  const producentByTier = await getProducentByTier();

  const winCountsByTier = { budzetowy: new Map(), sredni: new Map(), premium: new Map() };
  let totalProfiles = 0;

  function walk(answers) {
    const steps = resolvePath(answers, producentByTier);
    const last = steps[steps.length - 1];

    if (last.id === "wynik") {
      totalProfiles++;
      const candidates = byTier[last.profile.budzet];
      const best = pickBest(candidates, last.profile);
      if (!best) return;
      const counts = winCountsByTier[last.profile.budzet];
      counts.set(best.name, (counts.get(best.name) || 0) + 1);
      return;
    }

    for (const opt of last.options) {
      walk({ ...answers, [last.id]: opt.id });
    }
  }

  walk({});

  const summary = {};
  for (const tier of Object.keys(byTier)) {
    const counts = winCountsByTier[tier];
    const totalWinsInTier = [...counts.values()].reduce((a, b) => a + b, 0);
    const topWinners = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, wins]) => ({ name, wins, sharePct: totalWinsInTier ? Math.round((wins / totalWinsInTier) * 1000) / 10 : 0 }));

    summary[tier] = {
      catalogCount: byTier[tier].length,
      distinctWinners: counts.size,
      topWinners,
    };
  }

  return NextResponse.json({ totalProfiles, summary });
}
