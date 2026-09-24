"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { getPool } from "../../../lib/db.js";

// Sibling to /admin/specs-patch, but for the editorial columns instead of
// the specs jsonb - verdict/summary/pros/cons for products that were
// inserted with real specs but no copy (e.g. by the telefony_merged.json
// import). A full REPLACE of these four columns per slug, not a merge -
// there's nothing partial to preserve in an empty verdict/summary/[]/[].
export async function patchEditorial(prevState, formData) {
  await requireAdmin();

  const raw = (formData.get("payload") || "").toString().trim();
  if (!raw) return { status: "error", message: "Wklej JSON" };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { status: "error", message: `Niepoprawny JSON: ${err.message}` };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { status: "error", message: "Oczekiwano obiektu { slug: { verdict, summary, pros, cons } }, nie tablicy" };
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return { status: "error", message: "Pusty obiekt" };

  const results = [];
  let failed = 0;

  // Validate everything in JS first - only well-formed entries go into the
  // single bulk UPDATE below. Order of results.push mirrors input order;
  // the "updated"/"not_found" rows for valid entries are filled in after
  // the bulk write, once we know which slugs the DB actually matched.
  const valid = [];
  for (const [slug, fields] of entries) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      failed++;
      results.push({ slug, status: "error", note: "wartość musi być obiektem { verdict, summary, pros, cons }" });
      continue;
    }
    const { verdict, summary, pros, cons } = fields;
    if (typeof verdict !== "string" || !verdict.trim()) {
      failed++;
      results.push({ slug, status: "error", note: "brak lub puste pole verdict" });
      continue;
    }
    if (typeof summary !== "string" || !summary.trim()) {
      failed++;
      results.push({ slug, status: "error", note: "brak lub puste pole summary" });
      continue;
    }
    if (!Array.isArray(pros) || pros.length === 0 || !Array.isArray(cons) || cons.length === 0) {
      failed++;
      results.push({ slug, status: "error", note: "pros/cons muszą być niepustymi tablicami" });
      continue;
    }
    valid.push({ slug, verdict, summary, pros, cons });
    results.push({ slug, status: "pending", note: verdict });
  }

  let updated = 0;
  let notFound = 0;

  if (valid.length > 0) {
    const pool = getPool();
    // One round-trip for the whole batch instead of one UPDATE per slug -
    // a few hundred sequential queries (e.g. a full-category rewrite) blew
    // past the Server Action's time limit here before. unnest() zips the
    // parallel arrays back into rows for the UPDATE...FROM join.
    let matchedSlugs;
    try {
      const { rows } = await pool.query(
        `UPDATE products AS p
         SET verdict = data.verdict, summary = data.summary, pros = data.pros::jsonb, cons = data.cons::jsonb, updated_at = now()
         FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
           AS data(slug, verdict, summary, pros, cons)
         WHERE p.slug = data.slug
         RETURNING p.slug`,
        [
          valid.map((v) => v.slug),
          valid.map((v) => v.verdict),
          valid.map((v) => v.summary),
          valid.map((v) => JSON.stringify(v.pros)),
          valid.map((v) => JSON.stringify(v.cons)),
        ]
      );
      matchedSlugs = new Set(rows.map((r) => r.slug));
    } catch (err) {
      return { status: "error", message: `Zapis do bazy nie powiódł się: ${err.message}` };
    }

    for (const result of results) {
      if (result.status !== "pending") continue;
      if (matchedSlugs.has(result.slug)) {
        result.status = "updated";
        updated++;
      } else {
        result.status = "not_found";
        result.note = "brak produktu o tym slugu";
        notFound++;
      }
    }
  }

  revalidatePath("/admin");

  return {
    status: "done",
    message: `Zaktualizowano ${updated}, nie znaleziono ${notFound}, błędów ${failed} — z ${entries.length} pozycji.`,
    results,
  };
}
