import { getPool } from "./db.js";

// Turns a wizard profile (lib/wizardTree.js resolvePath's "wynik" step)
// into one real phone from the catalog. price_tier is the only HARD
// filter — every other preference ranks candidates rather than filtering
// them, because the catalog doesn't cover every brand at every tier (e.g.
// no budget Xiaomi), so a hard filter could leave a whole tier with zero
// candidates. This mirrors the relax-rather-than-omit philosophy in
// lib/matching.js.
//
// Ranking is LEXICOGRAPHIC, not a blended sum: candidates are compared one
// criterion at a time, in the order the user actually stated they matter,
// and a tie is the only thing that falls through to the next one. A
// blended sum (score + weighted bonuses) was tried first and measured
// against the real catalog: it let "good at everything" phones dominate
// almost every segment regardless of the stated priority — only 14-22% of
// the catalog could ever win at all. Ranking by the stated priority
// outright means the best camera in the tier actually wins when the user
// says the camera is what matters, full stop, with everything else only
// breaking ties.

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

function brandFit(candidate, profile) {
  if (profile.marka === "tak" && profile.producent && profile.producent !== "nietypowe") {
    return candidate.brand === profile.producent ? 1 : -1;
  }
  if (profile.marka === "tak" && profile.producent === "nietypowe") {
    return candidate.brand_recognition === "niche" ? 1 : 0;
  }
  if (profile.marka === "niszowa") {
    return candidate.brand_recognition === "niche" ? 1 : -1;
  }
  return 0;
}

// Convention: a foldable product has `specs.foldable: true` (set via the
// admin product form's raw specs JSON — no dedicated column yet).
function foldFit(candidate, profile) {
  const isFoldable = candidate.specs?.foldable === true;
  if (profile.foldable === "skladany") return isFoldable ? 1 : -1;
  if (profile.foldable === "klasyczny" && isFoldable) return -1;
  return 0;
}

// Negative when `a` should rank ABOVE `b`. Order of criteria: every
// priority tag the user picked, highest-priority first (an exact tie
// falls through to the next one) — then screen fit, brand fit, foldable
// fit, and only at the very end the catalog's own curated `score`. That
// last step is also why picking "no strong preference" correctly lands on
// "the best-rated phone in the tier", exactly what that option promises:
// with no tags to compare, every criterion above it is a no-op tie.
function compareCandidates(a, b, profile) {
  for (const tag of profile.tags) {
    const diff = tagValue(tag, b.specs) - tagValue(tag, a.specs);
    if (diff !== 0) return diff;
  }

  const screenDiff = screenValue(profile.screenPreference, b.specs) - screenValue(profile.screenPreference, a.specs);
  if (screenDiff !== 0) return screenDiff;

  const brandDiff = brandFit(b, profile) - brandFit(a, profile);
  if (brandDiff !== 0) return brandDiff;

  const foldDiff = foldFit(b, profile) - foldFit(a, profile);
  if (foldDiff !== 0) return foldDiff;

  return (Number(b.score) || 0) - (Number(a.score) || 0);
}

export function pickBest(candidates, profile) {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (compareCandidates(candidates[i], best, profile) < 0) best = candidates[i];
  }
  return best;
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

  return pickBest(result.rows, profile);
}
