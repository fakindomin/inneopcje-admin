"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { validateImportPayload } from "../../../lib/importValidation.js";
import { getCategoryIdBySlug, insertManualProduct, linkManualAlternatives } from "../../../lib/adminImport.js";

export async function importProduct(prevState, formData) {
  await requireAdmin();

  const category = (formData.get("category") || "").toString();
  const name = (formData.get("name") || "").toString().trim();
  const rawJson = (formData.get("payload") || "").toString().trim();

  if (!category) return { status: "error", message: "Wybierz kategorię" };
  if (!name) return { status: "error", message: "Podaj nazwę produktu" };
  if (!rawJson) return { status: "error", message: "Wklej odpowiedź JSON z czatu Gemini" };

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return { status: "error", message: `Niepoprawny JSON: ${err.message}` };
  }

  const { data, error } = validateImportPayload(parsed, category);
  if (error) return { status: "error", message: error };

  const categoryId = await getCategoryIdBySlug(category);
  if (!categoryId) return { status: "error", message: `Nieznana kategoria "${category}"` };

  const status = data.confidence === "wysoka" ? "published" : "draft";
  const product = await insertManualProduct(categoryId, name, data, status);

  let linked = 0;
  if (status === "published") {
    linked = await linkManualAlternatives(categoryId, product);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/import");

  return {
    status: "success",
    message: `Zapisano "${product.name}" jako ${
      status === "published" ? "opublikowany" : "do przejrzenia (draft)"
    }${linked > 0 ? ` — ${linked} powiązanych alternatyw` : ""}.`,
  };
}
