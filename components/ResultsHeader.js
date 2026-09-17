"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SearchBox from "./SearchBox";
import { IconSearch } from "./icons";

export default function ResultsHeader({ defaultValue }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
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
        <form action="/wyniki" method="GET" className="mt-3">
          <SearchBox defaultValue={defaultValue} />
        </form>
      )}
    </div>
  );
}
