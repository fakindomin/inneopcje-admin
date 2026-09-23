"use client";

import PageSlide from "./PageSlide.js";
import { IconPhone, IconTv } from "./icons.js";

export default function CategoryTiles() {
  return (
    <PageSlide className="w-full max-w-[420px] mt-8">
      {(navigate) => (
        <div className="grid grid-cols-2 gap-3">
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
      )}
    </PageSlide>
  );
}
