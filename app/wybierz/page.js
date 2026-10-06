"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo.js";
import PageSlide from "../../components/PageSlide.js";
import CategoryTiles from "../../components/CategoryTiles.js";

// Category picker shown after "Pomóż mi wybrać różne opcje" on the
// homepage. Only Gry is live (-> app/wybierz/gry); Książki/Filmy/Muzyka are
// shown disabled until those categories have products.
export default function WybierzPage() {
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
              Co Cię interesuje?
            </p>

            <CategoryTiles navigate={navigate} />
          </>
        )}
      </PageSlide>
    </main>
  );
}
