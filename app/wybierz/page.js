"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GryWizard from "../../components/GryWizard.js";
import PageSlide from "../../components/PageSlide.js";
import Logo from "../../components/Logo.js";

// Single category (gry) - no CategoryTiles picker screen needed anymore,
// so this goes straight into the wizard instead of asking "co szukasz"
// first. See app/wybierz/gry/page.js's removal in the same commit; this
// replaces it rather than redirecting to it.
export default function WybierzPage() {
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
                <span className="text-brand-ink">Dobierz</span> <span className="text-brand-orange">grę</span>
              </p>
              <button type="button" onClick={() => navigate("/")} aria-label="Strona główna">
                <Logo width={20} height={16} />
              </button>
            </div>
            <GryWizard />
          </>
        )}
      </PageSlide>
    </main>
  );
}
