"use client";

import { useActionState } from "react";
import { updateProductAction, deleteProductAction } from "../app/admin/products/[id]/actions.js";
import ConfirmButton from "./ConfirmButton.js";

const inputClass = "w-full border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white";
const labelClass = "text-xs text-brand-muted mb-1 block";

export default function EditProductForm({ product, categories }) {
  const [state, formAction, pending] = useActionState(updateProductAction, null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="border border-brand-border rounded-lg p-4 bg-white flex flex-col gap-4">
        <input type="hidden" name="id" value={product.id} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Kategoria</label>
          <select name="category" defaultValue={product.category_slug} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Nazwa</label>
          <input type="text" name="name" defaultValue={product.name} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Marka</label>
          <input type="text" name="brand" defaultValue={product.brand} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Rozpoznawalność marki</label>
          <select name="brand_recognition" defaultValue={product.brand_recognition} className={inputClass}>
            <option value="mainstream">mainstream</option>
            <option value="niche">niche</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Segment cenowy</label>
          <select name="price_tier" defaultValue={product.price_tier} className={inputClass}>
            <option value="budzetowy">budzetowy</option>
            <option value="sredni">sredni</option>
            <option value="premium">premium</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Rok premiery</label>
          <input
            type="number"
            name="release_year"
            defaultValue={product.release_year ?? ""}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ocena (1-10)</label>
          <input
            type="number"
            name="score"
            step="0.1"
            min="1"
            max="10"
            defaultValue={product.score}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Werdykt</label>
        <input type="text" name="verdict" defaultValue={product.verdict} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Podsumowanie</label>
        <textarea name="summary" defaultValue={product.summary} rows={3} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Zalety (jedna na linię)</label>
          <textarea
            name="pros"
            defaultValue={(product.pros ?? []).join("\n")}
            rows={4}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
        <div>
          <label className={labelClass}>Wady (jedna na linię)</label>
          <textarea
            name="cons"
            defaultValue={(product.cons ?? []).join("\n")}
            rows={4}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Specyfikacja (JSON, musi zawierać price_pln_approx)</label>
        <textarea
          name="specs"
          defaultValue={JSON.stringify(product.specs ?? {}, null, 2)}
          rows={10}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      {state?.status === "error" && <p className="text-xs text-red-700">{state.message}</p>}
      {state?.status === "success" && <p className="text-xs text-green-700">{state.message}</p>}

        <button
          type="submit"
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream disabled:opacity-50 self-start"
        >
          {pending ? "Zapisywanie..." : "Zapisz zmiany"}
        </button>
      </form>

      <form action={deleteProductAction.bind(null, product.id)}>
        <ConfirmButton
          confirmText={`Usunąć "${product.name}"? Tego nie da się cofnąć.`}
          className="text-xs px-2.5 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
        >
          Usuń produkt
        </ConfirmButton>
      </form>
    </div>
  );
}
