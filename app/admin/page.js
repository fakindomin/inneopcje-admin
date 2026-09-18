import Link from "next/link";
import {
  listProducts,
  listFailedQueue,
  listCategories,
  getBotEnabled,
  listRecentRuns,
  getStatusCounts,
  getQueueDepth,
  getTodayRequestEstimate,
} from "../../lib/adminQueries.js";
import AutoRefresh from "../../components/AutoRefresh.js";
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

// Confirmed on aistudio.google.com/rate-limit for gemini-3.5-flash-lite on
// this project (RPD 500). Check that dashboard for the current real number —
// this is just a display reference, not read from the API.
const GEMINI_DAILY_QUOTA_ESTIMATE = 500;

// A run stuck in "running" past this many minutes is almost certainly a
// GitHub Actions job someone re-ran on a stale commit rather than a fresh
// "Run workflow" — the job itself times out after 40 minutes
// (BATCH_SIZE=450 in the bot repo's scripts/build.js @ ~4.2s/call).
const STUCK_THRESHOLD_MINUTES = 45;

const LIVE_STATUS_STYLES = {
  running: "bg-green-100 text-green-800",
  stuck: "bg-red-100 text-red-800",
  quota: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  idle: "bg-brand-cream text-brand-muted",
};

function minutesSince(dateValue) {
  return (Date.now() - new Date(dateValue).getTime()) / 60000;
}

function isQuotaNote(note) {
  return typeof note === "string" && /resource_exhausted|quota|429/i.test(note);
}

function getLiveStatus(latestRun) {
  if (!latestRun) return { kind: "idle", label: "Brak danych — bot jeszcze nie uruchamiał się z aktualnym kodem." };

  if (latestRun.status === "running") {
    const mins = minutesSince(latestRun.started_at);
    return mins > STUCK_THRESHOLD_MINUTES
      ? {
          kind: "stuck",
          label: `Wygląda na zawieszony od ${formatDateTime(latestRun.started_at)} — sprawdź, czy ktoś nie użył "Re-run jobs" na starym uruchomieniu zamiast "Run workflow".`,
        }
      : { kind: "running", label: `W trakcie, od ${formatDateTime(latestRun.started_at)}.` };
  }

  if (latestRun.status === "failed" && isQuotaNote(latestRun.note)) {
    return {
      kind: "quota",
      label: `Gemini: wygląda na wyczerpany dzienny limit (przebieg ${formatDateTime(
        latestRun.started_at
      )}) — kolejna szansa przy następnym uruchomieniu.`,
    };
  }

  if (latestRun.status === "failed") {
    return { kind: "error", label: `Ostatni przebieg zakończony błędem: ${latestRun.note ?? "brak szczegółów"}` };
  }

  return { kind: "idle", label: `Bezczynny — ostatni przebieg (${formatDateTime(latestRun.started_at)}) zakończony OK.` };
}

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

// innaopcja-bot's cron runs hourly (not a single guessed daily time — see
// .github/workflows/build-database.yml) and just checks whether there's
// quota left; most ticks on an already-exhausted day exit in seconds.
function nextScheduledRunLabel() {
  const now = new Date();
  const minutesLeft = 59 - now.getUTCMinutes();
  return `za ${minutesLeft} min (co godzinę — większość sprawdzeń nic nie robi, jeśli limit dzienny już wyczerpany)`;
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status ?? "all";
  const category = params?.category ?? "all";

  const [products, failedQueue, categories, botEnabled, recentRuns, statusCounts, queueDepth, todayRequests] =
    await Promise.all([
      listProducts({ status, category }),
      listFailedQueue(),
      listCategories(),
      getBotEnabled(),
      listRecentRuns(),
      getStatusCounts(),
      getQueueDepth(),
      getTodayRequestEstimate(),
    ]);

  const categoryTabs = [{ value: "all", label: "wszystkie kategorie" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))];
  const ranToday = recentRuns.some((r) => r.status !== "skipped" && isToday(r.started_at));
  const liveStatus = getLiveStatus(recentRuns[0]);
  const tabCounts = {
    all: statusCounts.published + statusCounts.draft,
    published: statusCounts.published,
    draft: statusCounts.draft,
  };

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <AutoRefresh />
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

        <div className="flex items-start gap-2 mb-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${LIVE_STATUS_STYLES[liveStatus.kind]}`}>
            {liveStatus.kind === "running" ? "na żywo" : liveStatus.kind}
          </span>
          <p className="text-xs text-brand-secondary">{liveStatus.label}</p>
        </div>

        <p className="text-xs text-brand-muted mb-3">
          Dzisiaj (szacunkowo): {todayRequests}/{GEMINI_DAILY_QUOTA_ESTIMATE} zapytań do Gemini
          {todayRequests >= GEMINI_DAILY_QUOTA_ESTIMATE ? " — limit prawdopodobnie wyczerpany" : ""}. Realny limit
          sprawdzisz na{" "}
          <a
            href="https://aistudio.google.com/rate-limit"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-brand-ink"
          >
            aistudio.google.com/rate-limit
          </a>
          .
        </p>

        <p className="text-xs text-brand-muted mb-3">
          {ranToday ? "Dzisiaj już był przebieg." : "Dzisiaj jeszcze nie było przebiegu."} Harmonogram (cron) działa
          niezależnie od tego przełącznika — kiedy bot jest wyłączony, zaplanowany przebieg po prostu nic nie robi.
          Następny zaplanowany przebieg: {nextScheduledRunLabel()}. Strona odświeża się sama co 15s.
        </p>

        {Object.keys(queueDepth).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(queueDepth).map(([cat, counts]) => (
              <div key={cat} className="text-xs border border-brand-border rounded-md px-3 py-2">
                <p className="font-medium text-brand-ink mb-0.5">{cat}</p>
                <p className="text-brand-secondary">
                  {counts.pending} czeka &middot; {counts.done} zrobione &middot; {counts.failed} błędy
                </p>
              </div>
            ))}
          </div>
        )}

        {recentRuns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {recentRuns.slice(0, 8).map((r) => (
              <div key={r.id} className="text-xs">
                <div className="flex items-center justify-between text-brand-secondary">
                  <span>
                    {formatDateTime(r.started_at)} &middot; {r.category ?? "—"} &middot;{" "}
                    {RUN_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                  {r.status !== "skipped" && (
                    <span className="text-brand-muted">
                      +{r.published_count} pub / {r.draft_count} draft / {r.failed_count} błąd
                    </span>
                  )}
                </div>
                {r.note && <p className="text-brand-muted mt-0.5">{r.note}</p>}
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
                className="flex items-center justify-between gap-3 border border-brand-border rounded-lg p-3 bg-white"
              >
                <div>
                  <p className="text-xs text-brand-ink">
                    {item.category} &middot; {item.product_name}
                  </p>
                  {item.last_error && <p className="text-xs text-brand-muted mt-0.5">{item.last_error}</p>}
                </div>
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
