"use client";

import PhoneWizard from "../../../components/PhoneWizard.js";
import PageSlide from "../../../components/PageSlide.js";

export default function WybierzTelefonyPage() {
  return (
    <main className="max-w-[600px] mx-auto px-6 py-10">
      <PageSlide>
        {(navigate) => (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-lg font-medium">
                <span className="text-brand-ink">Dobierz</span> <span className="text-brand-orange">telefon</span>
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm text-brand-secondary hover:text-brand-ink"
              >
                ← Strona główna
              </button>
            </div>
            <PhoneWizard />
          </>
        )}
      </PageSlide>
    </main>
  );
}
