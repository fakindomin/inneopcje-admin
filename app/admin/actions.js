"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, destroySession } from "../../lib/adminAuth.js";
import {
  setProductStatus,
  deleteProduct,
  resetQueueItem,
  addCategory,
  setBotEnabled,
  listCategories,
} from "../../lib/adminQueries.js";
import { getProductCategoryId, recomputeCategoryAlternatives } from "../../lib/adminImport.js";

export async function publishProduct(id) {
  await requireAdmin();
  await setProductStatus(id, "published");
  const categoryId = await getProductCategoryId(id);
  if (categoryId) await recomputeCategoryAlternatives(categoryId);
  revalidatePath("/admin");
}

export async function unpublishProduct(id) {
  await requireAdmin();
  await setProductStatus(id, "draft");
  const categoryId = await getProductCategoryId(id);
  if (categoryId) await recomputeCategoryAlternatives(categoryId);
  revalidatePath("/admin");
}

export async function removeProduct(id) {
  await requireAdmin();
  const categoryId = await getProductCategoryId(id);
  await deleteProduct(id);
  if (categoryId) await recomputeCategoryAlternatives(categoryId);
  revalidatePath("/admin");
}

export async function retryQueueItem(id) {
  await requireAdmin();
  await resetQueueItem(id);
  revalidatePath("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function createCategory(formData) {
  await requireAdmin();
  const name = (formData.get("name") || "").toString();
  await addCategory(name);
  revalidatePath("/admin");
}

export async function setBotEnabledAction(enabled) {
  await requireAdmin();
  await setBotEnabled(enabled);
  revalidatePath("/admin");
}

// product_alternatives is a CACHE, written once by recomputeCategoryAlternatives
// and otherwise only refreshed as a side effect of specific product-level
// admin actions (publish/unpublish/delete/edit, duplicate-cleanup) - a change
// to the MATCHING ALGORITHM itself (lib/matching.js) has no such trigger, so
// every category's cached rows silently keep reflecting whatever logic was
// live the last time any of those actions ran, until something forces a
// full recompute. This is that manual trigger.
export async function recomputeAllAlternatives() {
  await requireAdmin();
  const categories = await listCategories();
  let total = 0;
  for (const category of categories) {
    total += await recomputeCategoryAlternatives(category.id);
  }
  revalidatePath("/admin");
  // A plain server action has nothing else to show for itself -
  // revalidatePath alone re-renders a page with no visible trace this ran,
  // so the redirect carries the result for the confirmation banner below.
  redirect(`/admin?recomputed=${total}`);
}
