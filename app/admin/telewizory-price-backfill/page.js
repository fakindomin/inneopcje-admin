import Link from "next/link";
import { getPool } from "../../../lib/db.js";
import TelewizoryPriceBackfillPanel from "../../../components/TelewizoryPriceBackfillPanel.js";

// Queries the DB directly - can't be statically prerendered at build time
// (preview deployments have no DATABASE_URL; it's production-only).
export const dynamic = "force-dynamic";

export default async function TelewizoryPriceBackfillPage() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telewizory' AND p.price_checked_at IS NULL`
  );

  return (
    <main className="max-w-[700px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Ceny telewizorów</span> <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Katalog zaimportowany z <code className="text-[11px] bg-brand-cream px-1 py-0.5 rounded">data/telewizory_merged.json</code>{" "}
        nie ma cen — ta strona dogrywa je pojedynczo przez Gemini (wyszukiwanie w sieci), osobnym kluczem od tego
        używanego przez telefony, żeby nie dzielić limitu. Klik "Start" przetwarza paczki po 10 w kółko, aż
        skończy — możesz zamknąć kartę i wrócić później, licznik pamięta postęp w bazie.
      </p>

      <TelewizoryPriceBackfillPanel initialRemaining={rows[0].n} />
    </main>
  );
}
