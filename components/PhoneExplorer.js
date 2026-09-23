"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import VerdictCard from "./VerdictCard";
import AlternativeCard from "./AlternativeCard";
import PageSlide from "./PageSlide";
import { IconArrowLeft, IconPhone, IconBox } from "./icons";

// Which categories have their own wizard to restart into, and what that
// tile should say - only telefony for now (see components/CategoryTiles.js,
// telewizory is still "wkrótce"). A category with no entry here just
// doesn't get a "dobierz nowy X" tile, only the generic "dobierz nowy
// sprzęt" one.
const CATEGORY_WIZARDS = {
  telefony: { label: "Dobierz nowy telefon", href: "/wybierz/telefony", Icon: IconPhone },
};

export default function PhoneExplorer({ initialProduct, initialAlternatives, backTo }) {
  const router = useRouter();
  const categoryWizard = CATEGORY_WIZARDS[initialProduct.category_slug];

  // Same reasoning as components/HomeTiles.js: the tiles below fire
  // navigate() (a plain button, not <Link>), which skips Next's automatic
  // viewport prefetch.
  useEffect(() => {
    if (categoryWizard) router.prefetch(categoryWizard.href);
    router.prefetch("/wybierz");
  }, [router, categoryWizard]);

  return (
    <main className="max-w-[680px] mx-auto px-6 py-8">
      <PageSlide>
        {(navigate) => (
          <>
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => navigate("/")} className="flex items-center gap-1.5">
                <Logo width={20} height={16} />
                <span className="text-[13px] font-medium text-brand-ink">
                  innaopcja<span className="text-brand-orange">.pl</span>
                </span>
              </button>
            </div>

            {backTo && (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-ink mb-3"
              >
                <IconArrowLeft />
                Wróć do {backTo.name}
              </button>
            )}

            <VerdictCard product={initialProduct} />

            <p className="text-lg font-medium mb-4 text-center">
              <span className="text-brand-ink">Inne</span> <span className="text-brand-orange">Opcje</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
              {initialAlternatives.map((alt, i) => (
                <div key={alt.slug} className="animate-slide-in" style={{ animationDelay: `${i * 70}ms` }}>
                  <AlternativeCard alt={alt} fromSlug={initialProduct.slug} fromName={initialProduct.name} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {categoryWizard && (
                <button type="button" className="big-tile" onClick={() => navigate(categoryWizard.href)}>
                  <span className="big-tile-icon">
                    <categoryWizard.Icon width={20} height={20} />
                  </span>
                  <span className="big-tile-label">{categoryWizard.label}</span>
                </button>
              )}
              <button type="button" className="big-tile" onClick={() => navigate("/wybierz")}>
                <span className="big-tile-icon">
                  <IconBox width={20} height={20} />
                </span>
                <span className="big-tile-label">Dobierz nowy sprzęt</span>
              </button>
            </div>
          </>
        )}
      </PageSlide>
    </main>
  );
}
