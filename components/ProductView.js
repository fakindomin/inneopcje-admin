"use client";

import Link from "next/link";
import PageSlide from "./PageSlide.js";
import VerdictCard from "./VerdictCard.js";
import AlternativeCard from "./AlternativeCard.js";
import { IconArrowLeft } from "./icons.js";

// Replaces the old (phone-specific) PhoneExplorer now that there's a
// single category - just the verdict for this product plus its up to 3
// Taniej/Lepiej/Inaczej alternatives (lib/matching.js's computeAlternatives
// is already category-agnostic, so this needed no changes there).
export default function ProductView({ product, alternatives, backTo }) {
  return (
    <main className="max-w-[600px] mx-auto px-6 py-10">
      <PageSlide>
        {(navigate) => (
          <>
            {backTo && (
              <button
                type="button"
                onClick={() => navigate(`/produkt/${backTo.slug}`)}
                className="flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-ink mb-3"
              >
                <IconArrowLeft />
                Wróć do {backTo.name}
              </button>
            )}

            <VerdictCard product={product} />

            {alternatives.length > 0 && (
              <>
                <p className="text-lg font-medium mb-4 text-center">
                  <span className="text-brand-ink">Inne</span> <span className="text-brand-orange">Opcje</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch mb-6">
                  {alternatives.map((alt) => (
                    <AlternativeCard key={alt.slug} alt={alt} fromSlug={product.slug} fromName={product.name} />
                  ))}
                </div>
              </>
            )}

            <Link href="/wybierz" className="big-tile big-tile-compact w-full">
              <span className="big-tile-label">Dobierz nową grę</span>
            </Link>
          </>
        )}
      </PageSlide>
    </main>
  );
}
