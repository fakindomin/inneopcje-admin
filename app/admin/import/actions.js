"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/adminAuth.js";
import { validateImportPayload } from "../../../lib/importValidation.js";
import {
  getCategoryIdBySlug,
  findExistingProduct,
  insertManualProduct,
  updateProduct,
  recomputeCategoryAlternatives,
} from "../../../lib/adminImport.js";

// Gemini chat answers are sometimes wrapped in a ```json ... ``` fence even
// when asked not to — strip it before JSON.parse instead of erroring out.
function stripCodeFence(text) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function importProducts(prevState, formData) {
  await requireAdmin();

  const category = (formData.get("category") || "").toString();
  const rawJson = stripCodeFence((formData.get("payload") || "").toString().trim());
  // "update": a model that already exists gets its row overwritten with the
  // freshly pasted data instead of being skipped — for backfilling fields
  // added to the import prompt after a model was first imported, by simply
  // re-running the same scope through Gemini again.
  const updateExisting = formData.get("mode") === "update";

  if (!category) return { status: "error", message: "Wybierz kategorię" };
  if (!rawJson) return { status: "error", message: "Wklej odpowiedź JSON z czatu Gemini" };

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return { status: "error", message: `Niepoprawny JSON: ${err.message}` };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) return { status: "error", message: "Tablica JSON jest pusta" };

  const categoryId = await getCategoryIdBySlug(category);
  if (!categoryId) return { status: "error", message: `Nieznana kategoria "${category}"` };

  const results = [];
  let published = 0;
  let draft = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const rawName = typeof item?.name === "string" ? item.name.trim() : null;
    const { data, error } = validateImportPayload(item, category);

    if (error) {
      failed++;
      results.push({ name: rawName ?? "(brak nazwy)", status: "error", note: error });
      continue;
    }

    const existing = await findExistingProduct(categoryId, data.name);
    if (existing) {
      if (updateExisting) {
        await updateProduct(existing.id, categoryId, data);
        updated++;
        results.push({ name: data.name, status: "updated", note: `zaktualizowano (${existing.slug})` });
      } else {
        skipped++;
        results.push({ name: data.name, status: "skipped", note: `już jest w bazie (${existing.slug})` });
      }
      continue;
    }

    const status = data.confidence === "wysoka" ? "published" : "draft";
    const product = await insertManualProduct(categoryId, data.name, data, status);

    if (status === "published") published++;
    else draft++;
    results.push({ name: product.name, status, note: product.slug });
  }

  // One pass over the whole category after the batch, not per-item — so
  // e.g. item #1 in this same paste also sees item #5 as a candidate.
  if (published > 0 || updated > 0) {
    await recomputeCategoryAlternatives(categoryId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/import");

  return {
    status: "done",
    message: `Gotowe: ${published} opublikowanych, ${draft} do przejrzenia, ${updated} zaktualizowanych, ${skipped} pominiętych (już istniały), ${failed} błędów — z ${items.length} pozycji.`,
    results,
  };
}
