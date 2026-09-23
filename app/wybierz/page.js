"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import PageSlide from "../../components/PageSlide";
import CategoryTiles from "../../components/CategoryTiles";

export default function WybierzPage() {
  // Warms "/" for the back button below - same reasoning as
  // components/HomeTiles.js (navigate() skips <Link>'s auto-prefetch).
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  return (
    <main className="min-h-dvh flex flex-col items-center px-6 pt-16 sm:pt-24 pb-16">
      <PageSlide className="w-full flex flex-col items-center">
        {(navigate) => (
          <>
            <button type="button" onClick={() => navigate("/")} aria-label="Strona główna">
              <Logo width={80} height={63} label="innaopcja.pl" />
            </button>

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
