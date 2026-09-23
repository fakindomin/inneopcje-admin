"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconCompass } from "./icons.js";

// Pure grid, no PageSlide of its own - the page that renders this owns ONE
// PageSlide wrapping its whole content (logo, tagline, and this grid
// together), so the entire screen moves as one block, not just the tiles.
export default function HomeTiles({ navigate }) {
  // navigate() calls router.push() from a plain button, not <Link> - which
  // means none of Next's automatic viewport prefetching happens, so the
  // FIRST tap on a given tile has to wait on a real network round trip for
  // that route's data before the entrance animation can even start.
  // Prefetching both destinations as soon as this screen mounts (well
  // before anyone can tap, since they still have to read the tiles first)
  // warms the cache so every visible tap feels as instant as a repeat one.
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/szukaj");
    router.prefetch("/wybierz");
  }, [router]);

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-8">
      <button type="button" className="big-tile" onClick={() => navigate("/szukaj")}>
        <span className="big-tile-icon">
          <IconSearch width={20} height={20} />
        </span>
        <span className="big-tile-label">Znam model który chcę porównać</span>
      </button>

      <button type="button" className="big-tile" onClick={() => navigate("/wybierz")}>
        <span className="big-tile-icon">
          <IconCompass width={20} height={20} />
        </span>
        <span className="big-tile-label">Pomóż mi wybrać różne opcje</span>
      </button>
    </div>
  );
}
