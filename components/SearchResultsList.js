"use client";

import { useState } from "react";
import VerdictCard from "./VerdictCard";
import AlternativeCard from "./AlternativeCard";
import { IconArrowLeft } from "./icons";

export default function SearchResultsList({ results }) {
  const [openSlug, setOpenSlug] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle(slug) {
    if (openSlug === slug) {
      setOpenSlug(null);
      setDetail(null);
      return;
    }

    setOpenSlug(slug);
    setDetail(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/phone/${slug}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  const visibleResults = openSlug ? results.filter((result) => result.slug === openSlug) : results;

  return (
    <div className="flex flex-col gap-3">
      {!openSlug && <p className="text-lg font-medium mb-1 text-center">Wyniki wyszukiwania</p>}
      {visibleResults.map((result) => {
        const isOpen = openSlug === result.slug;

        if (isOpen) {
          return (
            <div key={result.slug} className="animate-slide-in">
              <button
                type="button"
                onClick={() => toggle(result.slug)}
                className="flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-ink mb-3"
              >
                <IconArrowLeft />
                Wróć do wyników
              </button>

              {loading || !detail ? (
                <div className="bg-white border border-brand-ink rounded-xl p-4 text-sm text-brand-secondary">
                  Ładowanie…
                </div>
              ) : (
                <>
                  <VerdictCard product={detail.product} />
                  <p className="text-lg font-medium mb-4 text-center">
                    <span className="text-brand-ink">Inne</span> <span className="text-brand-orange">Opcje</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                    {detail.alternatives.map((alt) => (
                      <AlternativeCard
                        key={alt.slug}
                        alt={alt}
                        fromSlug={detail.product.slug}
                        fromName={detail.product.name}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        }

        return (
          <button
            key={result.slug}
            type="button"
            onClick={() => toggle(result.slug)}
            className="w-full text-left flex flex-col bg-white border border-brand-ink rounded-xl p-3.5 hover:bg-brand-cream transition-colors"
          >
            <p className="font-medium text-sm text-brand-ink mb-0.5">{result.name}</p>
            <p className="text-xs text-brand-muted mb-1.5">
              {result.price_pln_approx} zł &middot; {Number(result.score).toFixed(1)}/10
            </p>
            <p className="text-xs text-brand-secondary leading-relaxed">{result.verdict}</p>
          </button>
        );
      })}
    </div>
  );
}
