"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { getPool } from "../../../lib/db.js";

// Merges a JSON object of { slug: { specKey: value, ... }, ... } into each
// product's EXISTING specs via Postgres' jsonb `||` operator - only the
// keys present in the patch are touched, everything else already on the
// row (verdict, score, pros/cons, other specs keys) is left alone. This is
// deliberately separate from the Gemini-paste import flow, which replaces
// a product's entire row and would silently clobber good existing content
// with placeholder data if used for a partial field backfill.
export async function patchSpecs(prevState, formData) {
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
    return { status: "error", message: "Oczekiwano obiektu { slug: { pola }, ... }, nie tablicy" };
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return { status: "error", message: "Pusty obiekt" };

  const pool = getPool();
  const results = [];
  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const [slug, patch] of entries) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      failed++;
      results.push({ slug, status: "error", note: "wartość musi być obiektem pól specs" });
      continue;
    }

    try {
      const { rowCount } = await pool.query(
        `UPDATE products SET specs = specs || $1::jsonb, updated_at = now() WHERE slug = $2`,
        [JSON.stringify(patch), slug]
      );
      if (rowCount === 0) {
        notFound++;
        results.push({ slug, status: "not_found", note: "brak produktu o tym slugu" });
      } else {
        updated++;
        results.push({ slug, status: "updated", note: Object.keys(patch).join(", ") });
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
