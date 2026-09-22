import Link from "next/link";
import { findDuplicateGroups } from "../../../lib/duplicateCleanup.js";
import DuplicateCleanupForm from "../../../components/DuplicateCleanupForm.js";

export default async function DuplicateCleanupPage() {
  const { exactNameDuplicateGroups, generationSuffixDuplicateGroups, crossBrandDuplicateGroups } =
    await findDuplicateGroups();
  const allGroups = [...exactNameDuplicateGroups, ...generationSuffixDuplicateGroups, ...crossBrandDuplicateGroups];

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Duplikaty telefonów</span>{" "}
          <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Grupy produktów, których nazwy są identyczne albo różnią się tylko sufiksem 5G/4G — zwykle ten sam telefon
        wpisany dwukrotnie. Dla każdej grupy zaznaczona jest domyślnie kopia z gorzej uzupełnioną specyfikacją do
        wycofania (status → draft, nie kasowanie na trwałe — można przywrócić w{" "}
        <Link href="/admin" className="underline">
          /admin
        </Link>
        ). Odznacz grupy, które są w rzeczywistości różnymi produktami (np. faktyczne osobne warianty 4G/5G).
      </p>

      {allGroups.length === 0 ? (
        <p className="text-sm text-brand-muted">Brak wykrytych duplikatów.</p>
      ) : (
        <DuplicateCleanupForm groups={allGroups} />
      )}
    </main>
  );
}
