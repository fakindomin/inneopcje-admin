"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import SearchBox from "../../components/SearchBox";
import PageSlide from "../../components/PageSlide";

export default function SzukajPage() {
  // Warms "/" for the back button below - same reasoning as
  // components/HomeTiles.js (navigate() skips <Link>'s auto-prefetch).
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

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
        <Logo width={80} height={63} label="innaopcja.pl" />

        <p className="text-sm text-brand-secondary text-center max-w-[420px] mt-6">
          Znajdź lepszą opcję dla produktu, który Cię interesuje.
        </p>

        <div className="w-full max-w-[420px] mt-8">
          <form action="/wyniki" method="GET">
            <SearchBox />
          </form>
        </div>
      </PageSlide>
    </main>
  );
}
