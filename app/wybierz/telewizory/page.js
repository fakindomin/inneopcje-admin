"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TvWizard from "../../../components/TvWizard.js";
import PageSlide from "../../../components/PageSlide.js";
import Logo from "../../../components/Logo.js";

// Preview-only route, not yet linked from CategoryTiles.js (still shows
// "Telewizor: wkrótce" there) - reachable directly at /wybierz/telewizory
// for reviewing the question flow before real matching is wired up.
export default function WybierzTelewizoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  return (
    <main className="max-w-[600px] mx-auto px-6 py-10">
      <PageSlide>
        {(navigate) => (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-lg font-medium">
                <span className="text-brand-ink">Dobierz</span> <span className="text-brand-orange">telewizor</span>
              </p>
              <button type="button" onClick={() => navigate("/")} aria-label="Strona główna">
                <Logo width={20} height={16} />
              </button>
            </div>
            <TvWizard />
          </>
        )}
      </PageSlide>
    </main>
  );
}
