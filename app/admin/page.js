import Link from "next/link";
import {
  listProducts,
  listFailedQueue,
  listCategories,
  getBotEnabled,
  listRecentRuns,
  getStatusCounts,
} from "../../lib/adminQueries.js";
import {
  publishProduct,
  unpublishProduct,
  removeProduct,
  retryQueueItem,
  logoutAction,
  createCategory,
  setBotEnabledAction,
} from "./actions.js";
import ConfirmButton from "../../components/ConfirmButton.js";

const STATUS_TABS = [
  { value: "all", label: "Wszystkie" },
  { value: "published", label: "Opublikowane" },
  { value: "draft", label: "Do przejrzenia" },
];

const RUN_STATUS_LABELS = {
  running: "w trakcie",
  success: "OK",
  failed: "błąd",
  skipped: "pominięty (bot wyłączony)",
};

function isToday(dateValue) {
  const d = new Date(dateValue);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextScheduledRunLabel() {
  const now = new Date();
  return now.getUTCHours() < 6 ? "dziś o 06:00 UTC" : "jutro o 06:00 UTC";
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status ?? "all";
  const category = params?.category ?? "all";

  const [products, failedQueue, categories, botEnabled, recentRuns, statusCounts] = await Promise.all([
    listProducts({ status, category }),
    listFailedQueue(),
    listCategories(),
    getBotEnabled(),
    listRecentRuns(),
    getStatusCounts(),
  ]);

  const categoryTabs = [{ value: "all", label: "wszystkie kategorie" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))];
  const ranToday = recentRuns.some((r) => r.status !== "skipped" && isToday(r.started_at));
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

      {/* Bot */}
      <div className="border border-brand-border rounded-lg p-4 bg-white mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                botEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {botEnabled ? "Włączony" : "Wyłączony"}
            </span>
            <p className="text-sm font-medium text-brand-ink">Bot budujący bazę</p>
          </div>
          <form action={setBotEnabledAction.bind(null, !botEnabled)}>
            <button
              type="submit"
              className={`text-xs px-2.5 py-1 rounded-md border ${
                botEnabled
                  ? "border-red-300 text-red-700 hover:bg-red-50"
                  : "border-brand-ink hover:bg-brand-cream"
              }`}
            >
              {botEnabled ? "Zatrzymaj" : "Uruchom"}
            </button>
          </form>
        </div>

        <p className="text-xs text-brand-muted mb-3">
          {ranToday ? "Dzisiaj już był przebieg." : "Dzisiaj jeszcze nie było przebiegu."} Harmonogram (cron) działa
          niezależnie od tego przełącznika — kiedy bot jest wyłączony, zaplanowany przebieg po prostu nic nie robi.
          Następny zaplanowany przebieg: {nextScheduledRunLabel()}.
        </p>

        {recentRuns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {recentRuns.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs text-brand-secondary">
                <span>
                  {formatDateTime(r.started_at)} &middot; {r.category ?? "—"} &middot; {RUN_STATUS_LABELS[r.status] ?? r.status}
                </span>
                {r.status !== "skipped" && (
                  <span className="text-brand-muted">
                    +{r.published_count} pub / {r.draft_count} draft / {r.failed_count} błąd
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-brand-muted">Brak historii przebiegów jeszcze.</p>
        )}
      </div>

      {/* Kategorie */}
      <div className="border border-brand-border rounded-lg p-4 bg-white mb-6">
        <p className="text-sm font-medium text-brand-ink mb-3">Kategorie</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <span key={c.id} className="text-xs px-2.5 py-1 rounded-md border border-brand-border text-brand-secondary">
              {c.name}
            </span>
          ))}
          {categories.length === 0 && <p className="text-xs text-brand-muted">Brak kategorii.</p>}
        </div>
        <form action={createCategory} className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Nazwa nowej kategorii, np. Laptopy"
            className="border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white flex-1"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream shrink-0"
          >
            Dodaj kategorię
          </button>
        </form>
        <p className="text-xs text-brand-muted mt-2">
          Nowa kategoria trafia automatycznie do rotacji bota — nie trzeba nic zmieniać w kodzie.
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab.value] ?? 0;
          const needsAttention = tab.value === "draft" && count > 0;
          return (
            <Link
              key={tab.value}
              href={`/admin?status=${tab.value}&category=${category}`}
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

      <div className="flex flex-wrap gap-2 mb-6">
        {categoryTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin?status=${status}&category=${tab.value}`}
            className={`text-xs px-2.5 py-1 rounded-md border ${
              category === tab.value
                ? "border-brand-orange text-brand-orange"
                : "border-brand-border text-brand-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-brand-muted mb-3">{products.length} produktów</p>

      <div className="flex flex-col gap-3 mb-10">
        {products.map((p) => (
          <div key={p.id} className="border border-brand-border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div>
                <p className="text-xs text-brand-muted">
                  {p.category} &middot; {p.brand} &middot; {p.price_tier}
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
                href={`/produkt/${p.slug}`}
                target="_blank"
                className="text-xs px-2.5 py-1 rounded-md border border-brand-border text-brand-muted hover:bg-brand-cream ml-auto"
              >
                Zobacz na stronie
              </Link>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-brand-muted">Brak produktów dla tego filtra.</p>}
      </div>

      {failedQueue.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Kolejka — błędy ({failedQueue.length})</p>
          <div className="flex flex-col gap-2">
            {failedQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border border-brand-border rounded-lg p-3 bg-white"
              >
                <p className="text-xs text-brand-ink">
                  {item.category} &middot; {item.product_name}
                </p>
                <form action={retryQueueItem.bind(null, item.id)}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 rounded-md border border-brand-ink hover:bg-brand-cream"
                  >
                    Spróbuj ponownie
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
