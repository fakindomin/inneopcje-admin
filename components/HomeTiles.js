"use client";

import PageSlide from "./PageSlide.js";
import { IconSearch, IconCompass } from "./icons.js";

export default function HomeTiles() {
  return (
    <PageSlide className="w-full max-w-[420px] mt-8">
      {(navigate) => (
        <div className="grid grid-cols-2 gap-3">
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
      )}
    </PageSlide>
  );
}
