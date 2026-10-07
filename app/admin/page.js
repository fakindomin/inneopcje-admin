import Link from "next/link";
import { listProducts, getStatusCounts } from "../../lib/adminQueries.js";
import { publishProduct, unpublishProduct, removeProduct, logoutAction, recomputeAllAlternatives } from "./actions.js";
import ConfirmButton from "../../components/ConfirmButton.js";

// Queries the DB directly - can't be statically prerendered at build time
// (preview deployments have no DATABASE_URL; it's production-only).
export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "all", label: "Wszystkie" },
  { value: "published", label: "Opublikowane" },
  { value: "draft", label: "Do przejrzenia" },
];

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status ?? "all";
  const q = params?.q ?? "";

  const [products, statusCounts] = await Promise.all([listProducts({ status, q }), getStatusCounts()]);

  const tabCounts = {
    all: statusCounts.published + statusCounts.draft,
    published: statusCounts.published,
    draft: statusCounts.draft,
  };

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Admin</span> <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-brand-secondary hover:text-brand-ink">
            Wyloguj
          </button>
        </form>
      </div>

      {params?.recomputed != null && (
        <div className="mb-4 text-xs px-3 py-2 rounded-md border border-green-300 bg-green-50 text-green-800">
          Przeliczono Podobne/Inaczej/"A może..." dla {params.recomputed} opublikowanych produktów.
        </div>
      )}

      {/* Narzędzia */}
      <div className="border border-brand-border rounded-lg p-4 bg-white mb-4">
        <p className="text-sm font-medium text-brand-ink mb-3">Narzędzia</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/editorial-patch"
            className="text-xs px-2.5 py-1.5 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-cream"
          >
            Uzupełnij opisy produktów
          </Link>
          <form action={recomputeAllAlternatives}>
            <button
              type="submit"
              className="text-xs px-2.5 py-1.5 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-cream"
            >
              Odśwież podpowiedzi na stronach produktów
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab.value] ?? 0;
          const needsAttention = tab.value === "draft" && count > 0;
          return (
            <Link
              key={tab.value}
              href={`/admin?status=${tab.value}`}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border ${
                status === tab.value
                  ? "border-brand-ink bg-brand-ink text-brand-cream"
                  : "border-brand-border text-brand-secondary"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] leading-none px-1.5 py-0.5 rounded-full ${
                  needsAttention
                    ? "bg-amber-100 text-amber-800"
                    : status === tab.value
                    ? "bg-white/20 text-brand-cream"
                    : "bg-brand-cream text-brand-muted"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <form action="/admin" className="flex gap-2 mb-3">
        <input type="hidden" name="status" value={status} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Szukaj po nazwie lub marce (cała baza)..."
          className="border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white flex-1"
        />
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream shrink-0"
        >
          Szukaj
        </button>
        {q && (
          <Link
            href={`/admin?status=${status}`}
            className="text-xs px-3 py-1.5 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-cream shrink-0"
          >
            Wyczyść
          </Link>
        )}
      </form>

      <p className="text-xs text-brand-muted mb-3">{products.length} produktów</p>

      <div className="flex flex-col gap-3 mb-10">
        {products.map((p) => (
          <div key={p.id} className="border border-brand-border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div>
                <p className="text-xs text-brand-muted">
                  {p.brand} &middot; {p.price_tier}
                </p>
                <p className="font-medium text-sm text-brand-ink">
                  {p.name} <span className="text-brand-muted font-normal">({p.score})</span>
                </p>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                  p.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {p.status}
              </span>
            </div>
            <p className="text-xs text-brand-secondary mb-1">{p.verdict}</p>
            <p className="text-xs text-brand-muted mb-3">{p.summary}</p>
            <div className="flex items-center gap-2">
              {p.status === "draft" ? (
                <form action={publishProduct.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 rounded-md border border-brand-ink hover:bg-brand-cream"
                  >
                    Publikuj
                  </button>
                </form>
              ) : (
                <form action={unpublishProduct.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-cream"
                  >
                    Cofnij do draft
                  </button>
                </form>
              )}
              <form action={removeProduct.bind(null, p.id)}>
                <ConfirmButton
                  confirmText={`Usunąć "${p.name}"? Tego nie da się cofnąć.`}
                  className="text-xs px-2.5 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                >
                  Usuń
                </ConfirmButton>
              </form>
              <Link
                href={`/admin/products/${p.id}`}
                className="text-xs px-2.5 py-1 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-cream ml-auto"
              >
                Edytuj
              </Link>
              <Link
                href={`/produkt/${p.slug}`}
                target="_blank"
                className="text-xs px-2.5 py-1 rounded-md border border-brand-border text-brand-muted hover:bg-brand-cream"
              >
                Zobacz na stronie
              </Link>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-brand-muted">Brak produktów dla tego filtra.</p>}
      </div>
    </main>
  );
}
