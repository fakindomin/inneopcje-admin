"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconPhone, IconTv } from "./icons.js";

// Pure grid, no PageSlide of its own - see components/HomeTiles.js for why.
export default function CategoryTiles({ navigate }) {
  // Same reasoning as HomeTiles.js: navigate() bypasses <Link>'s automatic
  // prefetch, so warm the one enabled destination's cache as soon as this
  // screen mounts instead of on first tap.
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/wybierz/telefony");
    router.prefetch("/wybierz/telewizory");
  }, [router]);

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-8">
      <button type="button" className="big-tile" onClick={() => navigate("/wybierz/telefony")}>
        <span className="big-tile-icon">
          <IconPhone width={20} height={20} />
        </span>
        <span className="big-tile-label">Telefon</span>
      </button>

      <button type="button" className="big-tile" onClick={() => navigate("/wybierz/telewizory")}>
        <span className="big-tile-icon">
          <IconTv width={20} height={20} />
        </span>
        <span className="big-tile-label">Telewizor</span>
      </button>
    </div>
  );
}
