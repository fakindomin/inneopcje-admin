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

export async function publishProduct(id) {
  await requireAdmin();
  await setProductStatus(id, "published");
  revalidatePath("/admin");
}

export async function unpublishProduct(id) {
  await requireAdmin();
  await setProductStatus(id, "draft");
  revalidatePath("/admin");
}

export async function removeProduct(id) {
  await requireAdmin();
  await deleteProduct(id);
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
