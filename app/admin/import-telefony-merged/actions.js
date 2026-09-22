"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { runTelefonyMergedImport } from "../../../lib/telefonyMergedImport.js";

// Replaces the telefony catalog's live content with data/telefony_merged.json:
// existing products that match by name are updated in place (specs/score/
// price_tier/brand_recognition refreshed, slug/verdict/summary/pros/cons
// kept), unmatched entries are inserted as new published products, and
// every previously-published telefony product NOT covered by the dataset
// is unpublished (status -> draft, never deleted).
export async function applyTelefonyMergedImport() {
  await requireAdmin();

  const result = await runTelefonyMergedImport();

  revalidatePath("/admin");
  revalidatePath("/admin/import-telefony-merged");
  revalidatePath("/wybierz/telefony");
  revalidatePath("/wyniki");
  revalidatePath("/");

  return { status: "done", result };
}
