"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { validateProductEdit } from "../../../../lib/importValidation.js";
import {
  getCategoryIdBySlug,
  getProductCategoryId,
  updateProduct,
  recomputeCategoryAlternatives,
} from "../../../../lib/adminImport.js";
import { deleteProduct } from "../../../../lib/adminQueries.js";

function splitLines(value) {
  return (value || "")
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateProductAction(prevState, formData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const category = (formData.get("category") || "").toString();

  let specs;
  try {
    specs = JSON.parse((formData.get("specs") || "{}").toString());
  } catch (err) {
    return { status: "error", message: `Niepoprawny JSON w polu specyfikacji: ${err.message}` };
  }

  const payload = {
    name: (formData.get("name") || "").toString(),
    verdict: (formData.get("verdict") || "").toString(),
    score: formData.get("score"),
    summary: (formData.get("summary") || "").toString(),
    pros: splitLines(formData.get("pros")),
    cons: splitLines(formData.get("cons")),
    specs,
    brand: (formData.get("brand") || "").toString(),
    brand_recognition: (formData.get("brand_recognition") || "").toString(),
    price_tier: (formData.get("price_tier") || "").toString(),
    release_year: formData.get("release_year"),
  };

  const { data, error } = validateProductEdit(payload, category);
  if (error) return { status: "error", message: error };

  const categoryId = await getCategoryIdBySlug(category);
  if (!categoryId) return { status: "error", message: `Nieznana kategoria "${category}"` };

  const oldCategoryId = await getProductCategoryId(id);

  await updateProduct(id, categoryId, data);
  await recomputeCategoryAlternatives(categoryId);
  if (oldCategoryId && oldCategoryId !== categoryId) {
    await recomputeCategoryAlternatives(oldCategoryId);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);

  return { status: "success", message: "Zapisano zmiany." };
}

export async function deleteProductAction(id) {
  await requireAdmin();
  const categoryId = await getProductCategoryId(id);
  await deleteProduct(id);
  if (categoryId) await recomputeCategoryAlternatives(categoryId);
  revalidatePath("/admin");
  redirect("/admin");
}
