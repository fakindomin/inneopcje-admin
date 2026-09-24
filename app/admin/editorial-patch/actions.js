"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { applyEditorialPatch } from "../../../lib/editorialPatch.js";

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

  let outcome;
  try {
    outcome = await applyEditorialPatch(parsed);
  } catch (err) {
    return { status: "error", message: err.message };
  }

  revalidatePath("/admin");

  return {
    status: "done",
    message: `Zaktualizowano ${outcome.updated}, nie znaleziono ${outcome.notFound}, błędów ${outcome.failed} — z ${outcome.total} pozycji.`,
    results: outcome.results,
  };
}
