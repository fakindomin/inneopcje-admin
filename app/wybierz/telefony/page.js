import Link from "next/link";
import PhoneWizard from "../../../components/PhoneWizard.js";

export default function WybierzTelefonyPage() {
  return (
    <main className="max-w-[600px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Dobierz</span> <span className="text-brand-orange">telefon</span>
        </p>
        <Link href="/" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Strona główna
        </Link>
      </div>
      <PhoneWizard />
    </main>
  );
}
