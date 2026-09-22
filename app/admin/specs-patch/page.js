import Link from "next/link";
import SpecsPatchForm from "../../../components/SpecsPatchForm.js";

export default function SpecsPatchPage() {
  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Łatka specyfikacji</span>{" "}
          <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Do dopisywania nowych pól specyfikacji (np. front_camera_mp, charging_w, screen_panel_type, weight_g,
        ip_rating, foldable) do telefonów, które już są w bazie — bez ruszania nazwy, werdyktu, oceny, plusów i
        minusów. Wklej obiekt JSON w formacie{" "}
        <code className="text-[11px] bg-brand-cream px-1 py-0.5 rounded">
          {"{ \"slug-telefonu\": { \"pole\": wartość }, ... }"}
        </code>
        . Listę slugów i aktualną specyfikację wszystkich telefonów zobaczysz pod{" "}
        <code className="text-[11px] bg-brand-cream px-1 py-0.5 rounded">/api/admin/product-roster</code>.
      </p>

      <SpecsPatchForm />
    </main>
  );
}
