import Link from "next/link";
import { listCategories } from "../../../lib/adminQueries.js";
import ImportForm from "../../../components/ImportForm.js";

// Queries the DB directly - can't be statically prerendered at build time
// (preview deployments have no DATABASE_URL; it's production-only).
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const categories = await listCategories();

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Ręczny import</span> <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Ta strona zastępuje automatyczną ocenę produktu przez bota: wygeneruj prompt, wklej go w zwykłym czacie
        Gemini (np. gemini.google.com), doprecyzuj/popraw odpowiedź jeśli trzeba, a potem wklej finalny JSON poniżej
        do zapisania w bazie.
      </p>

      {categories.length === 0 ? (
        <p className="text-sm text-brand-muted">Brak kategorii — dodaj kategorię w panelu głównym.</p>
      ) : (
        <ImportForm categories={categories} />
      )}
    </main>
  );
}
