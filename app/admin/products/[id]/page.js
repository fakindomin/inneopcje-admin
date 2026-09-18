import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, listCategories } from "../../../../lib/adminQueries.js";
import EditProductForm from "../../../../components/EditProductForm.js";

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductById(Number(id)), listCategories()]);

  if (!product) notFound();

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Edycja produktu</span> <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Status: <span className="font-medium text-brand-ink">{product.status}</span> — zmień go w głównym panelu
        (Publikuj / Cofnij do draft). Slug (adres URL) nie zmienia się przy edycji nazwy, żeby nie psuć istniejących
        linków.
      </p>

      <EditProductForm product={product} categories={categories} />
    </main>
  );
}
