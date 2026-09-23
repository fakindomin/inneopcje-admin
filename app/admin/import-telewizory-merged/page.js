import Link from "next/link";
import { previewTelewizoryMergedImport } from "../../../lib/telewizoryMergedImport.js";
import ImportTelewizoryMergedForm from "../../../components/ImportTelewizoryMergedForm.js";

// Queries the DB directly - can't be statically prerendered at build time
// (preview deployments have no DATABASE_URL; it's production-only).
export const dynamic = "force-dynamic";

export default async function ImportTelewizoryMergedPage() {
  const preview = await previewTelewizoryMergedImport();

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Import: nowa baza telewizorów</span>{" "}
          <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Robi z <code className="text-[11px] bg-brand-cream px-1 py-0.5 rounded">data/telewizory_merged.json</code>{" "}
        jedyne źródło prawdy dla kategorii telewizory: dopasowane po nazwie produkty są aktualizowane w miejscu
        (zachowują slug/URL, werdykt, opis, plusy/minusy — odświeżają się specyfikacja, ocena, price_tier), nowe
        wchodzą jako świeże produkty, a wszystko inne opublikowane, czego nie ma w tym pliku, zostaje wycofane
        (status → draft — nic nie jest kasowane, odwracalne w <Link href="/admin" className="underline">/admin</Link>
        ).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-brand-border rounded-lg p-3 bg-white">
          <div className="text-2xl font-medium">{preview.total}</div>
          <div className="text-xs text-brand-muted">w pliku</div>
        </div>
        <div className="border border-brand-border rounded-lg p-3 bg-white">
          <div className="text-2xl font-medium text-green-700">{preview.matchedCount}</div>
          <div className="text-xs text-brand-muted">dopasowane (update)</div>
        </div>
        <div className="border border-brand-border rounded-lg p-3 bg-white">
          <div className="text-2xl font-medium text-blue-700">{preview.unmatchedCount}</div>
          <div className="text-xs text-brand-muted">nowe (insert)</div>
        </div>
        <div className="border border-brand-border rounded-lg p-3 bg-white">
          <div className="text-2xl font-medium text-amber-700">{preview.ambiguousCount}</div>
          <div className="text-xs text-brand-muted">niejednoznaczne</div>
        </div>
      </div>

      {preview.unmatchedCount > 0 && (
        <details className="mb-4 border border-brand-border rounded-lg bg-white p-3">
          <summary className="text-xs font-medium cursor-pointer">
            {preview.unmatchedCount} nowych telewizorów (bez werdyktu/opisu — do uzupełnienia później)
          </summary>
          <ul className="text-xs text-brand-muted mt-2 grid grid-cols-2 gap-1">
            {preview.unmatched.map((u) => (
              <li key={u.entryId}>{u.brand} {u.model}</li>
            ))}
          </ul>
        </details>
      )}

      {preview.ambiguousCount > 0 && (
        <details className="mb-4 border border-amber-300 rounded-lg bg-amber-50 p-3">
          <summary className="text-xs font-medium cursor-pointer text-amber-800">
            {preview.ambiguousCount} niejednoznacznych dopasowań (pomijane — insert zamiast update)
          </summary>
          <ul className="text-xs text-amber-800 mt-2">
            {preview.ambiguous.map((a, i) => (
              <li key={i}>
                {a.brand} {a.model} → pasuje do kilku: {a.candidates.join(", ")}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="mb-6 border border-brand-border rounded-lg bg-white p-3">
        <summary className="text-xs font-medium cursor-pointer">
          {preview.matchedCount} dopasowanych produktów (podgląd)
        </summary>
        <ul className="text-xs text-brand-muted mt-2 max-h-[400px] overflow-y-auto">
          {preview.matched.map((m) => (
            <li key={m.entryId} className="py-0.5">
              <span className="text-brand-ink">{m.dbName}</span> ({m.slug}) — {m.price_tier}, ocena {m.score}
              {!m.wasPublished && <span className="text-amber-700"> — obecnie draft, zostanie opublikowany</span>}
            </li>
          ))}
        </ul>
      </details>

      <ImportTelewizoryMergedForm />
    </main>
  );
}
