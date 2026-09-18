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
