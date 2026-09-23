"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { runTelewizoryMergedImport } from "../../../lib/telewizoryMergedImport.js";

// Replaces the telewizory catalog's live content with
// data/telewizory_merged.json: existing products that match by name are
// updated in place (specs/score/price_tier/brand_recognition refreshed,
// slug/verdict/summary/pros/cons kept), unmatched entries are inserted as
// new published products, and every previously-published telewizory
// product NOT covered by the dataset is unpublished (status -> draft,
// never deleted).
export async function applyTelewizoryMergedImport() {
  await requireAdmin();

  const result = await runTelewizoryMergedImport();

  revalidatePath("/admin");
  revalidatePath("/admin/import-telewizory-merged");
  revalidatePath("/wybierz");
  revalidatePath("/wyniki");
  revalidatePath("/");

  return { status: "done", result };
}
