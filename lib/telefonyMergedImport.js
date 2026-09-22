import { getPool } from "./db.js";
import { normalizeQuery } from "./normalize.js";
import { recomputeCategoryAlternatives } from "./adminImport.js";
import telefonyMerged from "../data/telefony_merged.json" with { type: "json" };

// data/telefony_merged.json's `model` strings end with a storage token
// ("128GB", "8/128GB", "256GB") the live catalog's product names don't
// carry - strip everything from that token onward before matching.
function stripStorage(model) {
  return model.replace(/\s+\d+(\/\d+)?\s*(GB|TB).*$/i, "").trim();
}

// Some `model` values already repeat the brand ("Honor" brand + "Honor
// X8c 256GB" model, "Huawei" + "Huawei nova Y91 128GB") - collapse that
// before prefixing brand again, or matching would look for "Honor Honor
// X8c" against the catalog's "Honor X8c".
function dedupeBrandPrefix(brand, strippedModel) {
  const brandNorm = normalizeQuery(brand);
  const modelNorm = normalizeQuery(strippedModel);
  if (modelNorm.startsWith(brandNorm + " ")) return strippedModel.slice(brand.length).trim();
  return strippedModel;
}

function dedupedModel(entry) {
  return dedupeBrandPrefix(entry.brand, stripStorage(entry.model));
}

// Two candidate full names per entry: brand-prefixed (matches most of the
// catalog) and bare model (matches sub-brands the catalog files under
// their own brand, e.g. "POCO"/"Redmi" rather than "Xiaomi").
function candidateNames(entry) {
  const deduped = dedupedModel(entry);
  return [normalizeQuery(`${entry.brand} ${deduped}`), normalizeQuery(deduped)];
}

const FOLDABLE_PATTERN = /\b(fold|flip|razr|magic v)/i;
function isFoldable(entry) {
  return FOLDABLE_PATTERN.test(entry.model) || entry.model === "OnePlus Open";
}

function screenPanelType(panelType) {
  if (!panelType) return null;
  return /oled/i.test(panelType) ? "AMOLED" : "LED";
}

// Builds the full specs jsonb for a merged-dataset entry - a replace, not
// a sparse patch, since this becomes the product's whole spec sheet.
function buildSpecs(entry) {
  const s = entry.specs || {};
  return {
    screen_size_inches: s.screen?.size_inches ?? null,
    screen_panel_type: screenPanelType(s.screen?.panel_type),
    screen_refresh_hz: s.screen?.refresh_rate_hz ?? null,
    chipset: s.performance?.chipset ?? null,
    ram_gb: s.performance?.ram_gb ?? null,
    storage_gb: s.performance?.storage_gb ?? null,
    battery_mah: s.battery?.capacity_mah ?? null,
    charging_w: s.battery?.charging_wired_w ?? null,
    wireless_charging: s.battery?.wireless_charging ?? null,
    camera_main_mp: s.camera?.main_mp ?? null,
    camera_ultrawide_mp: s.camera?.ultrawide_mp ?? null,
    camera_telephoto_mp: s.camera?.telephoto_mp ?? null,
    front_camera_mp: s.camera?.selfie_mp ?? null,
    weight_g: s.physical?.weight_g ?? null,
    dimensions_mm: s.physical?.dimensions_mm ?? null,
    ip_rating: s.physical?.ip_rating ?? null,
    foldable: isFoldable(entry),
    price_pln: entry.price_pln ?? null,
    price_pln_approx: entry.price_pln != null ? String(entry.price_pln) : null,
    ean: entry.ean ?? null,
    brand_tier: entry.brand_tier ?? null,
    size_category: entry.size_category ?? null,
    // Real, hand-researched 1-5 axis scores. jakosc_ekranu_score feeds
    // lib/wizardMatch.js's jakosc_ekranu tag directly; the other three are
    // stored for future use only - the wizard still derives
    // wydajnosc/bateria/aparat from real specs (chipset classifier, raw
    // mAh/MP) rather than these curated scores, to avoid mixing a curated
    // pool with a spec-derived one in the same quintile ranking.
    jakosc_ekranu_score: entry.scores?.ekran ?? null,
    curated_wydajnosc_score: entry.scores?.wydajnosc ?? null,
    curated_bateria_score: entry.scores?.bateria ?? null,
    curated_aparat_score: entry.scores?.aparat ?? null,
  };
}

// 1-5 axis average, rescaled to the products.score column's 0-10 range
// (CHECK score >= 1 AND score <= 10, so a 1-5 average * 2 always fits).
function overallScore(entry) {
  const vals = Object.values(entry.scores || {}).filter((v) => Number.isFinite(v));
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 2 * 10) / 10;
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

// Dry-run matcher: for every data/telefony_merged.json entry, tries to
// find exactly one live telefony product it describes, by normalized
// name. Never writes - callers decide what to do with matched/unmatched.
async function matchEntries(pool) {
  const { rows } = await pool.query(
    `SELECT p.id, p.slug, p.name, p.brand, p.normalized_name, p.status
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony'`
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

  for (const entry of telefonyMerged) {
    const candidates = candidateNames(entry);
    let hit = null;
    for (const name of candidates) {
      const found = byNormalizedName.get(name);
      if (found && found.length === 1) {
        hit = found[0];
        break;
      }
      if (found && found.length > 1) {
        ambiguous.push({ entryId: entry.id, brand: entry.brand, model: entry.model, matchedName: name, candidates: found.map((f) => f.slug) });
      }
    }
    if (hit) matched.push({ entry, existing: hit });
    else unmatched.push({ entryId: entry.id, brand: entry.brand, model: entry.model, triedNames: candidates });
  }

  return { rows, matched, unmatched, ambiguous };
}

// Read-only preview for an admin UI: what would match, what wouldn't,
// what the resulting patch/insert would look like. Same matching logic
// the real import uses, so the preview is trustworthy.
export async function previewTelefonyMergedImport() {
  const pool = getPool();
  const { matched, unmatched, ambiguous } = await matchEntries(pool);
  return {
    total: telefonyMerged.length,
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
      score: overallScore(entry),
      price_tier: entry.price_tier,
    })),
    unmatched,
    ambiguous,
  };
}

// The real import: UPDATE every matched product in place (keeps its slug/
// URL/verdict/summary/pros/cons - only specs, price_tier, brand
// recognition and score refresh), INSERT one new row per unmatched entry
// (fresh slug, no editorial copy yet - that's a real gap for genuinely
// new phones, flagged in the return value), then set every telefony
// product NOT covered by this dataset to status = 'draft' (never DELETE -
// reversible from /admin, same as every other bulk change this session).
export async function runTelefonyMergedImport() {
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
         SET brand_recognition = $1, score = $2, specs = $3::jsonb, price_tier = $4, updated_at = now()
         WHERE id = $5`,
        [entry.brand_recognition, overallScore(entry), JSON.stringify(buildSpecs(entry)), entry.price_tier, existing.id]
      );
      // Publishing a previously-draft match is intentional: this dataset
      // is now the source of truth for which phones are live.
      await client.query(`UPDATE products SET status = 'published' WHERE id = $1`, [existing.id]);
      updated++;
    }

    const [{ id: categoryId }] = (
      await client.query(`SELECT id FROM categories WHERE slug = 'telefony'`)
    ).rows;

    for (const item of unmatched) {
      const entry = telefonyMerged.find((e) => e.id === item.entryId);
      const name = `${entry.brand} ${dedupedModel(entry)}`.trim();
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
          overallScore(entry),
          JSON.stringify(buildSpecs(entry)),
          entry.price_tier,
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
      newPhonesNeedingEditorialCopy: unmatched.map((u) => `${u.brand} ${u.model}`),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
