import Link from "next/link";
import EditorialPatchForm from "../../../components/EditorialPatchForm.js";

// Belt-and-suspenders alongside actions.js's bulk UPDATE...FROM unnest() -
// a very large pasted patch (hundreds of products) should now finish in
// well under a second either way, but this keeps a safety margin.
export const maxDuration = 60;

export default function EditorialPatchPage() {
  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg font-medium">
          <span className="text-brand-ink">Łatka werdyktu/opisu</span>{" "}
          <span className="text-brand-orange">innaopcja.pl</span>
        </p>
        <Link href="/admin" className="text-sm text-brand-secondary hover:text-brand-ink">
          ← Wróć do panelu
        </Link>
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Do poprawiania werdyktu, opisu i plusów/minusów istniejącego produktu (np. ręczna korekta jednej gry z
        data/gry.json). Nadpisuje całkowicie verdict/summary/pros/cons dla podanego sluga — score i specs
        zostają nietknięte. Wklej obiekt JSON w formacie{" "}
        <code className="text-[11px] bg-brand-cream px-1 py-0.5 rounded">
          {"{ \"slug\": { \"verdict\": \"...\", \"summary\": \"...\", \"pros\": [\"...\"], \"cons\": [\"...\"] } }"}
        </code>
        .
      </p>

      <EditorialPatchForm />
    </main>
  );
}
