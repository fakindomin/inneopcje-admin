import { getPool } from "./db.js";

// Shared by the /admin/editorial-patch form action and any one-off admin
// route that needs to apply the same { slug: { verdict, summary, pros,
// cons } } shape in bulk (see app/api/admin/apply-tv-editorial-patch) - a
// full REPLACE of these four columns per slug, not a merge, same as
// before. One round-trip via UPDATE ... FROM unnest() for the whole batch
// instead of one UPDATE per slug, which used to blow past the caller's
// time limit on a few-hundred-entry patch.
export async function applyEditorialPatch(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Oczekiwano obiektu { slug: { verdict, summary, pros, cons } }, nie tablicy");
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) throw new Error("Pusty obiekt");

  const results = [];
  let failed = 0;

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
    const matchedSlugs = new Set(rows.map((r) => r.slug));

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

  return {
    updated,
    notFound,
    failed,
    total: entries.length,
    results,
  };
}
