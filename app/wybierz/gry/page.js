"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GryWizard from "../../../components/GryWizard.js";
import PageSlide from "../../../components/PageSlide.js";
import Logo from "../../../components/Logo.js";

export default function WybierzGryPage() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/wybierz");
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
