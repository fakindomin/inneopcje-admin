"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import SearchBox from "./SearchBox";
import VerdictCard from "./VerdictCard";
import AlternativeCard from "./AlternativeCard";
import { IconArrowLeft, IconSearch } from "./icons";

export default function PhoneExplorer({ initialProduct, initialAlternatives, backTo }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="max-w-[680px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-3">
        <Link href="/" className="flex items-center gap-1.5">
          <Logo width={20} height={16} />
          <span className="text-[13px] font-medium text-brand-ink">
            innaopcja<span className="text-brand-orange">.pl</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Szukaj"
          className="text-brand-ink"
        >
          <IconSearch />
        </button>
      </div>

      {searchOpen && (
        <form action="/wyniki" method="GET" className="mb-3">
          <SearchBox />
        </form>
      )}

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
    </main>
  );
}
