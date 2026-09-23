"use client";

import { useActionState } from "react";
import { applyTelewizoryMergedImport } from "../app/admin/import-telewizory-merged/actions.js";

export default function ImportTelewizoryMergedForm() {
  const [state, formAction, pending] = useActionState(async () => applyTelewizoryMergedImport(), null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.status === "done" && (
        <div className="text-xs text-brand-ink bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Zaktualizowano {state.result.updated}, dodano {state.result.inserted}, wycofano{" "}
          {state.result.unpublished} produktów.
          {state.result.newTvsNeedingEditorialCopy.length > 0 && (
            <div className="mt-1 text-brand-muted">
              Nowe telewizory bez werdyktu/opisu (do uzupełnienia): {state.result.newTvsNeedingEditorialCopy.join(", ")}
            </div>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream self-start disabled:opacity-50"
      >
        {pending ? "Importowanie..." : "Zastosuj import (nadpisuje żywy katalog telewizorów)"}
      </button>
    </form>
  );
}
