import { getPool } from "./db.js";
import { getVerifiedDecision, getAllVerifiedGroups } from "./verifiedDuplicateDecisions.js";

function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Same "5G/4G suffix" heuristic as the original duplicate-check diagnostic -
// most duplicate rows in the catalog are the same phone imported twice
// under a "X" / "X 5G" name pair.
function normalizeNoGeneration(name) {
  return normalize(name).replace(/\s+(5g|4g)$/i, "");
}

const COMPLETENESS_FIELDS = [
  "chipset",
  "chipset_tier",
  "ram_gb",
  "battery_mah",
  "camera_main_mp",
  "screen_size_inches",
  "price_pln_approx",
  "front_camera_mp",
  "charging_w",
  "screen_panel_type",
  "weight_g",
  "ip_rating",
];

function completeness(row) {
  const specs = row.specs || {};
  let score = COMPLETENESS_FIELDS.reduce(
    (n, f) => n + (specs[f] !== undefined && specs[f] !== null && specs[f] !== "" ? 1 : 0),
    0
  );
  if (Array.isArray(row.pros)) score += row.pros.length > 0 ? 1 : 0;
  if (Array.isArray(row.cons)) score += row.cons.length > 0 ? 1 : 0;
  if (row.summary && row.summary.length > 20) score += 1;
  return score;
}

function shapeCandidate(row) {
  const specs = row.specs || {};
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price_tier: row.price_tier,
    release_year: row.release_year,
    score: row.score,
    completeness: completeness(row),
    chipset: specs.chipset ?? null,
    battery_mah: specs.battery_mah ?? null,
    camera_main_mp: specs.camera_main_mp ?? null,
    screen_size_inches: specs.screen_size_inches ?? null,
    price_pln_approx: specs.price_pln_approx ?? null,
    front_camera_mp: specs.front_camera_mp ?? null,
    charging_w: specs.charging_w ?? null,
    screen_panel_type: specs.screen_panel_type ?? null,
    weight_g: specs.weight_g ?? null,
    ip_rating: specs.ip_rating ?? null,
    foldable: specs.foldable ?? null,
  };
}

function shapeGroup(g) {
  const shaped = g.map(shapeCandidate).sort((a, b) => b.completeness - a.completeness);

  // A gsmarena.com-researched verdict, when one exists for this exact set
  // of slugs, overrides the completeness heuristic below - it reflects an
  // actual check of whether the phones are the same device, not a guess
  // from how populated their specs happen to be.
  const verified = getVerifiedDecision(shaped[0].slug);
  if (verified && shaped.every((c) => verified.slugs.includes(c.slug))) {
    return {
      recommendedKeepSlug: verified.verdict === "duplicate" ? verified.keepSlug : null,
      verified: { verdict: verified.verdict, reason: verified.reason },
      candidates: shaped,
    };
  }

  return { recommendedKeepSlug: shaped[0].slug, verified: null, candidates: shaped };
}

// Finds likely-duplicate telefony rows and scores each candidate by how
// complete its specs/content are, so a cleanup UI can pre-select "keep the
// better-populated copy" while still letting a human confirm or override
// before anything is touched. Used by both the admin cleanup page (direct
// call, server component) and the /api/admin/duplicate-cleanup diagnostic
// route (external fetch, same shape as the earlier duplicate-check route).
export async function findDuplicateGroups() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.slug, p.name, p.brand, p.price_tier, p.release_year, p.score, p.specs, p.pros, p.cons, p.summary
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
    if (exactSlugs.has(row.slug)) continue;
    const key = `${row.brand}::${normalizeNoGeneration(row.name)}`;
    if (!genGroups.has(key)) genGroups.set(key, []);
    genGroups.get(key).push(row);
  }
  const generationDuplicates = [...genGroups.values()].filter((g) => g.length > 1);
  const claimedSlugs = new Set([...exactSlugs, ...generationDuplicates.flatMap((g) => g.map((r) => r.slug))]);

  // Third pass: known duplicate pairs that differ in their `brand` column
  // (e.g. "POCO" vs "Xiaomi") and so were invisible to the two brand-scoped
  // detectors above. Only built from groups the gsmarena/spec-comparison
  // research already verified - this isn't a fuzzy live detector, since an
  // automatic cross-brand name match is too prone to false positives (e.g.
  // "OnePlus 12" / "Redmi 12" / "Xiaomi 12" are genuinely different phones
  // that happen to share a bare model number).
  const byRowSlug = new Map(rows.map((r) => [r.slug, r]));
  const crossBrandDuplicates = [];
  for (const group of getAllVerifiedGroups()) {
    if (group.slugs.some((s) => claimedSlugs.has(s))) continue;
    const matchedRows = group.slugs.map((s) => byRowSlug.get(s)).filter(Boolean);
    if (matchedRows.length > 1) {
      crossBrandDuplicates.push(matchedRows);
      for (const s of group.slugs) claimedSlugs.add(s);
    }
  }

  return {
    exactNameDuplicateGroups: exactDuplicates.map(shapeGroup),
    generationSuffixDuplicateGroups: generationDuplicates.map(shapeGroup),
    crossBrandDuplicateGroups: crossBrandDuplicates.map(shapeGroup),
  };
}
