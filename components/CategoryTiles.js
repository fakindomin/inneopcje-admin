"use client";

import { IconPhone, IconTv } from "./icons.js";

// Pure grid, no PageSlide of its own - see components/HomeTiles.js for why.
export default function CategoryTiles({ navigate }) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-8">
      <button type="button" className="big-tile" onClick={() => navigate("/wybierz/telefony")}>
        <span className="big-tile-icon">
          <IconPhone width={20} height={20} />
        </span>
        <span className="big-tile-label">Telefon</span>
      </button>

      <div className="big-tile big-tile-disabled" aria-disabled="true">
        <span className="big-tile-icon">
          <IconTv width={20} height={20} />
        </span>
        <span className="big-tile-label">Telewizor</span>
        <span className="big-tile-note">wkrótce</span>
      </div>
    </div>
  );
}
