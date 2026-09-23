"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconX } from "./icons";
import AlternativeCard from "./AlternativeCard.js";

export const PRICE_TIER_LABELS = {
  budzetowy: "budżetowy",
  sredni: "średni",
  premium: "premium",
};

function ceneoSearchUrl(name) {
  return `https://www.ceneo.pl/;szukaj-${encodeURIComponent(name).replace(/%20/g, "+")}`;
}

// Mirrors the server-side threshold in app/api/phone/[slug]/price/route.js
// - this copy only decides whether it's worth even calling that route; the
// route itself is the real authority on whether a refresh actually runs.
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(priceCheckedAt) {
  if (!priceCheckedAt) return true;
  return Date.now() - new Date(priceCheckedAt).getTime() > STALE_AFTER_MS;
}

// The result (wizard or product page) always renders immediately with
// whatever price is already cached - this never blocks that. Only when the
// price is actually stale does it quietly re-check in the background and
// swap the value in, with a small spinner next to it in the meantime.
function PriceLine({ slug, initialPrice, priceCheckedAt }) {
  const [price, setPrice] = useState(initialPrice || null);
  const [loading, setLoading] = useState(() => isStale(priceCheckedAt));

  useEffect(() => {
    if (!isStale(priceCheckedAt)) return;
    let cancelled = false;

    fetch(`/api/phone/${slug}/price`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.price_pln_approx) setPrice(data.price_pln_approx);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!price && !loading) return null;

  return (
    <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1.5">
      {price ? `${price} zł` : "sprawdzam cenę…"}
      {loading && (
        <span className="inline-block w-2.5 h-2.5 border-2 border-brand-muted border-t-transparent rounded-full animate-spin" />
      )}
    </p>
  );
}

// otherBrandPicks is only populated by the wizard flow (see
// lib/wizardMatch.js's findOtherBrandPicks) when someone picked more than
// one producent - the other two render sites (product page, search
// results) simply don't pass it, so this renders nothing extra for them.
export default function VerdictCard({ product, otherBrandPicks = [] }) {
  const score = Number(product.score).toFixed(1);

  return (
    <div className="bg-white border border-brand-ink rounded-xl p-4 mb-5">
      <div className="flex items-start justify-between gap-4 mb-2.5">
        <div>
          <p className="font-medium text-lg text-brand-ink">{product.name}</p>
          <PriceLine
            slug={product.slug}
            initialPrice={product.specs?.price_pln_approx}
            priceCheckedAt={product.price_checked_at}
          />
        </div>
        <div className="w-14 h-14 rounded-full bg-brand-orange flex items-center justify-center shrink-0">
          <span className="text-brand-cream font-bold text-xl">{score}</span>
        </div>
      </div>

      <p className="font-medium text-sm text-brand-ink mb-1">{product.verdict}</p>
      <p className="text-sm text-brand-secondary leading-relaxed mb-2.5">{product.summary}</p>

      <div className="grid grid-cols-2 gap-4 border-t border-brand-border pt-2.5">
        <div>
          <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center mb-1.5">
            <span className="text-brand-cream font-bold text-sm leading-none">+</span>
          </div>
          {product.pros.map((pro) => (
            <p key={pro} className="text-[13px] text-brand-ink flex gap-1.5 mb-0.5">
              <IconCheck className="text-green-700 mt-0.5 shrink-0" />
              {pro}
            </p>
          ))}
        </div>
        <div>
          <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center mb-1.5">
            <span className="text-brand-cream font-bold text-sm leading-none">−</span>
          </div>
          {product.cons.map((con) => (
            <p key={con} className="text-[13px] text-brand-ink flex gap-1.5 mb-0.5">
              <IconX className="text-red-700 mt-0.5 shrink-0" />
              {con}
            </p>
          ))}
        </div>
      </div>

      <a
        href={ceneoSearchUrl(product.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-brand-orange text-brand-cream rounded-md py-2 mt-3 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sprawdź na Ceneo
      </a>

      {otherBrandPicks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {otherBrandPicks.map((alt) => (
            <AlternativeCard key={alt.slug} alt={alt} fromSlug={product.slug} fromName={product.name} />
          ))}
        </div>
      )}
    </div>
  );
}
