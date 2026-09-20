import { getPool } from "./db.js";

// Turns a wizard profile (lib/wizardTree.js resolvePath's "wynik" step)
// into one real phone from the catalog. price_tier is the only HARD
// filter — every other preference is a soft score, because the catalog
// doesn't cover every brand at every tier (e.g. no budget Xiaomi yet), so
// hard-filtering on brand could leave a whole tier with zero candidates.
// This mirrors the relax-rather-than-omit philosophy in lib/matching.js.

// The first tag someone singles out (priorytet1) should outweigh a later
// or inferred one — see wizardTree.js's tagPicks ordering.
const TAG_WEIGHT_BY_RANK = [3, 2, 1];

// Rough ceilings pulled from the current catalog (migrations/0003), used
// only to squash each raw spec onto a comparable 0..1 scale before
// weighting it — not a hard cap, a phone above it just scores like the
// best one currently on file.
const TAG_CEILING = { aparat: 200, bateria: 7300, wydajnosc: 5 };

function tagValue(tag, specs) {
  if (tag === "aparat") return Number(specs?.camera_main_mp) || 0;
  if (tag === "bateria") return Number(specs?.battery_mah) || 0;
  if (tag === "wydajnosc") return Number(specs?.chipset_tier) || 0;
  return 0;
}

// Catalog currently spans roughly 6.1"-6.9", so that's the window a
// preference is scored against.
function screenValue(preference, specs) {
  const size = Number(specs?.screen_size_inches);
  if (!preference || preference === "brak" || !Number.isFinite(size)) return 0;
  if (preference === "kompakt") return Math.max(0, 6.9 - size);
  if (preference === "duzy") return Math.max(0, size - 6.1);
  return 0;
}

// `score` on the row is already a curated price/quality rating (see
// lib/matching.js) — every candidate starts from how good a pick it
// generally is within its own price tier, then gets pulled up or down by
// how well it fits what this user actually asked for.
export function scoreCandidate(candidate, profile) {
  let total = Number(candidate.score) || 0;

  profile.tags.forEach((tag, i) => {
    const weight = TAG_WEIGHT_BY_RANK[i] ?? 1;
    const ceiling = TAG_CEILING[tag] || 1;
    total += (tagValue(tag, candidate.specs) / ceiling) * weight;
  });

  total += screenValue(profile.screenPreference, candidate.specs) * 0.8;

  if (profile.marka === "tak" && profile.producent && profile.producent !== "nietypowe") {
    total += candidate.brand === profile.producent ? 3 : -2;
  } else if (profile.marka === "tak" && profile.producent === "nietypowe") {
    total += candidate.brand_recognition === "niche" ? 1.5 : 0;
  } else if (profile.marka === "niszowa") {
    total += candidate.brand_recognition === "niche" ? 2 : -1;
  }

  // No product in the catalog is marked as a foldable yet (see specs
  // schema) — nothing to score against until that data exists, so a
  // "skladany" answer is collected but has no effect here for now rather
  // than hard-filtering everyone to zero results.

  return total;
}

export async function matchTelefon(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published' AND p.price_tier = $1`,
    [profile.budzet]
  );

  const candidates = result.rows;
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreCandidate(b, profile) - scoreCandidate(a, profile));
  return candidates[0];
}
