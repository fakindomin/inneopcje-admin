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

  const pool = getPool();
  const results = [];
  let updated = 0;
  let notFound = 0;
  let failed = 0;

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

    try {
      const { rowCount } = await pool.query(
        `UPDATE products SET verdict = $1, summary = $2, pros = $3::jsonb, cons = $4::jsonb, updated_at = now()
         WHERE slug = $5`,
        [verdict, summary, JSON.stringify(pros), JSON.stringify(cons), slug]
      );
      if (rowCount === 0) {
        notFound++;
        results.push({ slug, status: "not_found", note: "brak produktu o tym slugu" });
      } else {
        updated++;
        results.push({ slug, status: "updated", note: verdict });
      }
    } catch (err) {
      failed++;
      results.push({ slug, status: "error", note: err.message });
    }
  }

  revalidatePath("/admin");

  return {
    status: "done",
    message: `Zaktualizowano ${updated}, nie znaleziono ${notFound}, błędów ${failed} — z ${entries.length} pozycji.`,
    results,
  };
}
