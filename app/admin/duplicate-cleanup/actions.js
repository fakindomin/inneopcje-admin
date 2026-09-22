"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { getPool } from "../../../lib/db.js";
import { setProductStatus } from "../../../lib/adminQueries.js";
import { getCategoryIdBySlug, recomputeCategoryAlternatives } from "../../../lib/adminImport.js";

// Soft-deletes the chosen duplicate copies by flipping status to "draft" -
// the same mechanism the rest of the admin panel already uses to hide a
// product from the site (every public query filters on status =
// 'published'), via the same setProductStatus() the main /admin unpublish
// button uses. Deliberately not a hard DELETE: duplicate resolution here is
// a judgment call made from a heuristic completeness score plus whatever a
// human overrides in the form, so it must stay reversible from /admin if a
// wrong copy gets unpublished. Also recomputes the "Lepiej"/alternatives
// cache once at the end, same as the main unpublish action does per-item.
export async function unpublishDuplicates(prevState, formData) {
  await requireAdmin();

  const slugs = [...new Set(formData.getAll("unpublish_slug").map((s) => s.toString()).filter(Boolean))];
  if (slugs.length === 0) {
    return { status: "error", message: "Nie zaznaczono żadnych produktów do wycofania." };
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, slug FROM products WHERE slug = ANY($1::text[]) AND status = 'published'`,
    [slugs]
  );

  for (const row of rows) {
    await setProductStatus(row.id, "draft");
  }

  const categoryId = await getCategoryIdBySlug("telefony");
  if (categoryId) await recomputeCategoryAlternatives(categoryId);

  revalidatePath("/admin");
  revalidatePath("/admin/duplicate-cleanup");

  return {
    status: "done",
    message: `Wycofano ${rows.length} z ${slugs.length} zaznaczonych produktów (status -> draft). Można je przywrócić w panelu /admin.`,
  };
}
