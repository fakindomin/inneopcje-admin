import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";
import { recomputeCategoryAlternatives } from "./adminImport.js";
import { classifyDisplayTechTier } from "./displayTechTiers.js";
import telewizoryMerged from "../data/telewizory_merged.json" with { type: "json" };

// Turns a 1-5 classifyDisplayTechTier() result into the same three-tier
// scale price_tier already uses everywhere else (wizard budget step,
// producent-by-tier lookups) - price_tier tracks image-quality technology
// here, not screen size or the raw PLN price (see lib/displayTechTiers.js).
function priceTierFromDisplayTech(displayTechnology) {
  const tier = classifyDisplayTechTier(displayTechnology);
  if (tier <= 2) return "budzetowy";
  if (tier === 3) return "sredni";
  return "premium";
}

// Rough 1-5 sub-scores computed straight from specs, no manual curation -
// same reasoning as chipsetTiers.js/displayTechTiers.js: a consistent
// classifier beats hand-entered scores that risk drifting product to
// product. Averaged and rescaled to products.score's 1-10 range below.
function obrazScore(specs) {
  const techTier = classifyDisplayTechTier(specs.display_technology);
  const resBonus = specs.resolution === "8K" ? 1 : 0;
  return Math.min(5, techTier + resBonus);
}

function gamingScore(specs) {
  const hz = specs.refresh_rate_hz ?? 60;
  let score = hz >= 144 ? 4 : hz >= 120 ? 3 : hz >= 100 ? 2 : 1;
  if ((specs.hdmi_2_1_ports ?? 0) > 0) score += 1;
  return Math.min(5, score);
}

// audio_watts is frequently missing (skipped rather than guessed at
// collection time - see data/telewizory_merged.json's entries) - a middle
// score in that case, same "don't invent data" spirit as leaving other
// unknown specs null instead of a default that reads as a real measurement.
function dzwiekScore(specs) {
  const w = specs.audio_watts;
  if (w == null) return 3;
  if (w >= 40) return 5;
  if (w >= 25) return 4;
  if (w >= 15) return 3;
  return 2;
}

function overallScore(specs) {
  const avg = (obrazScore(specs) + gamingScore(specs) + dzwiekScore(specs)) / 3;
  return Math.round(avg * 2 * 10) / 10;
}

// Builds the full specs jsonb for a merged-dataset entry - a replace, not a
// sparse patch, since this becomes the product's whole spec sheet.
function buildSpecs(entry) {
  const s = entry.specs || {};
  return {
    screen_size_inches: entry.screen_size_inches ?? null,
    display_technology: s.display_technology ?? null,
    resolution: s.resolution ?? null,
    refresh_rate_hz: s.refresh_rate_hz ?? null,
    hdmi_2_1_ports: s.hdmi_2_1_ports ?? null,
    peak_brightness_nits: s.peak_brightness_nits ?? null,
    audio_watts: s.audio_watts ?? null,
    smart_tv_system: s.smart_tv_system ?? null,
    price_pln_approx: entry.price_pln != null ? String(entry.price_pln) : null,
  };
}

function slugify(name) {
  return normalizeQuery(name).replace(/\s+/g, "-");
}

function uniqueSlug(baseSlug, takenSlugs) {
  if (!takenSlugs.has(baseSlug)) return baseSlug;
  let n = 2;
  while (takenSlugs.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

// Unlike telefony (one name = one product, storage variants aside), a TV
// model name here already encodes its screen size 1:1 with entry.model
// (see data/telewizory_merged.json's convention - "UE43CU7172" IS the
// 43" SKU), so the product name includes the size explicitly to keep
// distinct-size entries from colliding on the same normalized name.
function productName(entry) {
  return `${entry.brand} ${entry.model}`.trim();
}

// Dry-run matcher: for every data/telewizory_merged.json entry, tries to
// find exactly one live telewizory product it describes, by normalized
// name. Never writes - callers decide what to do with matched/unmatched.
async function matchEntries(pool) {
  const { rows } = await pool.query(
    `SELECT p.id, p.slug, p.name, p.brand, p.normalized_name, p.status
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory'`
  );

  const byNormalizedName = new Map();
  for (const row of rows) {
    const key = row.normalized_name || normalizeQuery(row.name);
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, []);
    byNormalizedName.get(key).push(row);
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];

  for (const entry of telewizoryMerged) {
    const name = normalizeQuery(productName(entry));
    const found = byNormalizedName.get(name);
    if (found && found.length === 1) {
      matched.push({ entry, existing: found[0] });
    } else if (found && found.length > 1) {
      ambiguous.push({ entryId: entry.id, brand: entry.brand, model: entry.model, matchedName: name, candidates: found.map((f) => f.slug) });
    } else {
      unmatched.push({ entryId: entry.id, brand: entry.brand, model: entry.model, triedName: name });
    }
  }

  return { rows, matched, unmatched, ambiguous };
}

// Read-only preview for an admin UI: what would match, what wouldn't, what
// the resulting patch/insert would look like. Same matching logic the real
// import uses, so the preview is trustworthy.
export async function previewTelewizoryMergedImport() {
  const pool = getPool();
  const { matched, unmatched, ambiguous } = await matchEntries(pool);
  return {
    total: telewizoryMerged.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    ambiguousCount: ambiguous.length,
    matched: matched.map(({ entry, existing }) => ({
      entryId: entry.id,
      brand: entry.brand,
      model: entry.model,
      slug: existing.slug,
      dbName: existing.name,
      wasPublished: existing.status === "published",
      score: overallScore(entry.specs || {}),
      price_tier: priceTierFromDisplayTech(entry.specs?.display_technology),
    })),
    unmatched,
    ambiguous,
  };
}

// The real import: UPDATE every matched product in place (keeps its slug/
// URL/verdict/summary/pros/cons - only specs, price_tier, brand
// recognition and score refresh), INSERT one new row per unmatched entry
// (fresh slug, no editorial copy yet - a real gap for genuinely new TVs,
// flagged in the return value), then set every telewizory product NOT
// covered by this dataset to status = 'draft' (never DELETE - reversible
// from /admin, same as telefony's merged import).
export async function runTelewizoryMergedImport() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows, matched, unmatched } = await matchEntries(pool);

    const takenSlugs = new Set(rows.map((r) => r.slug));
    let updated = 0;
    let inserted = 0;

    for (const { entry, existing } of matched) {
      await client.query(
        `UPDATE products
         SET brand_recognition = $1, score = $2, specs = $3::jsonb, price_tier = $4, release_year = $5, updated_at = now()
         WHERE id = $6`,
        [
          entry.brand_recognition,
          overallScore(entry.specs || {}),
          JSON.stringify(buildSpecs(entry)),
          priceTierFromDisplayTech(entry.specs?.display_technology),
          entry.release_year ?? null,
          existing.id,
        ]
      );
      // Publishing a previously-draft match is intentional: this dataset
      // is now the source of truth for which TVs are live.
      await client.query(`UPDATE products SET status = 'published' WHERE id = $1`, [existing.id]);
      updated++;
    }

    const [{ id: categoryId }] = (
      await client.query(`SELECT id FROM categories WHERE slug = 'telewizory'`)
    ).rows;

    for (const item of unmatched) {
      const entry = telewizoryMerged.find((e) => e.id === item.entryId);
      const name = productName(entry);
      const baseSlug = slugify(name);
      const slug = uniqueSlug(baseSlug, takenSlugs);
      takenSlugs.add(slug);
      await client.query(
        `INSERT INTO products
           (category_id, name, slug, normalized_name, brand, brand_recognition, verdict, score,
            summary, pros, cons, specs, price_tier, release_year, status)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, NULL, '[]'::jsonb, '[]'::jsonb, $8::jsonb, $9, $10, 'published')`,
        [
          categoryId,
          name,
          slug,
          normalizeQuery(name),
          entry.brand,
          entry.brand_recognition,
          overallScore(entry.specs || {}),
          JSON.stringify(buildSpecs(entry)),
          priceTierFromDisplayTech(entry.specs?.display_technology),
          entry.release_year ?? null,
        ]
      );
      inserted++;
    }

    const matchedIds = new Set(matched.map((m) => m.existing.id));
    const toUnpublish = rows.filter((r) => r.status === "published" && !matchedIds.has(r.id));
    for (const row of toUnpublish) {
      await client.query(`UPDATE products SET status = 'draft', updated_at = now() WHERE id = $1`, [row.id]);
    }

    await client.query("COMMIT");

    await recomputeCategoryAlternatives(categoryId);

    return {
      updated,
      inserted,
      unpublished: toUnpublish.length,
      unpublishedSlugs: toUnpublish.map((r) => r.slug),
      newTvsNeedingEditorialCopy: unmatched.map((u) => `${u.brand} ${u.model}`),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
