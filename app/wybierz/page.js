"use client";

import Logo from "../../components/Logo";
import PageSlide from "../../components/PageSlide";
import CategoryTiles from "../../components/CategoryTiles";

export default function WybierzPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center px-6 pt-16 sm:pt-24 pb-16">
      <PageSlide
        className="w-full flex flex-col items-center"
        footer={(navigate) => (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs text-brand-muted hover:text-brand-secondary mt-auto pt-10"
          >
            ← Strona główna
          </button>
        )}
      >
        {(navigate) => (
          <>
            <Logo width={80} height={63} label="innaopcja.pl" />

            <p className="text-sm text-brand-secondary text-center max-w-[420px] mt-6">
              Zacznij od wyboru rodzaju sprzętu.
            </p>

            <CategoryTiles navigate={navigate} />
          </>
        )}
      </PageSlide>
    </main>
  );
}
