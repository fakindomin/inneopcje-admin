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
export default function ProductView({ product, alternatives, backTo, platformy }) {
  // Forwarded through every link on this page so the wizard's chosen
  // platform(s) keep restricting "Inne Opcje" across however many hops the
  // user clicks through (see lib/queries.js's getAlternatives).
  const platformyParam = platformy && platformy.length > 0 ? platformy.join(",") : null;
  const withPlatformy = (href) =>
    platformyParam ? `${href}${href.includes("?") ? "&" : "?"}platformy=${encodeURIComponent(platformyParam)}` : href;

  // Lets a visitor who landed here with NO platform context yet (search, an
  // external link - not the wizard, which already asked) pick which of this
  // game's own platforms is theirs - "Inne Opcje" below then filters live to
  // that platform (lib/queries.js's getAlternatives). Only shown while
  // `platformy` is still empty: once a platform is known (from the wizard or
  // from picking one here), it keeps propagating silently through every
  // further click (ProductView/AlternativeCard) without asking again.
  const basePlatforms =
    (!platformy || platformy.length === 0) && Array.isArray(product.specs?.platformy) ? product.specs.platformy : [];
  function platformHref(platform) {
    const params = new URLSearchParams();
    if (backTo) {
      params.set("from", backTo.slug);
      params.set("fromName", backTo.name);
    }
    params.set("platformy", platform);
    return `/produkt/${product.slug}?${params.toString()}`;
  }

  return (
    <main className="max-w-[600px] mx-auto px-6 py-10">
      {/* Picking a platform re-renders this same /produkt/{slug} route with
          just a different ?platformy= query - the pathname doesn't change,
          so PageSlide needs an explicit navKey to still remount and replay
          its entrance animation (see PageSlide.js). */}
      <PageSlide navKey={`${product.slug}:${platformyParam ?? ""}`}>
        {(navigate) => (
          <>
            {backTo && (
              <button
                type="button"
                onClick={() => navigate(withPlatformy(`/produkt/${backTo.slug}`))}
                className="flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-ink mb-3"
              >
                <IconArrowLeft />
                Wróć do {backTo.name}
              </button>
            )}

            {basePlatforms.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-xs text-brand-muted">Twoja platforma:</span>
                {basePlatforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => navigate(platformHref(p))}
                    className="text-xs px-2.5 py-1 rounded-full border border-brand-border text-brand-secondary hover:bg-brand-cream"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <VerdictCard product={product} />

            {alternatives.length > 0 && (
              <>
                <p className="text-lg font-medium mb-4 text-center">
                  <span className="text-brand-ink">Inne</span> <span className="text-brand-orange">Opcje</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch mb-6">
                  {alternatives.map((alt) => (
                    <AlternativeCard
                      key={alt.slug}
                      alt={alt}
                      fromSlug={product.slug}
                      fromName={product.name}
                      platformy={platformyParam}
                    />
                  ))}
                </div>
              </>
            )}

            <Link href="/wybierz/gry" className="big-tile big-tile-compact w-full">
              <span className="big-tile-label">Dobierz nową grę</span>
            </Link>
          </>
        )}
      </PageSlide>
    </main>
  );
}
