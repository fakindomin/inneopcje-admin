"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconGamepad, IconBook, IconFilm, IconMusic } from "./icons.js";

// Shown after picking "Pomóż mi wybrać różne opcje" on the homepage - only
// Gry has published products right now, so it's the only clickable tile;
// Książki/Filmy/Muzyka are reserved for when those categories launch.
export default function CategoryTiles({ navigate }) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/wybierz/gry");
  }, [router]);

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-8">
      <button type="button" className="big-tile" onClick={() => navigate("/wybierz/gry")}>
        <span className="big-tile-icon">
          <IconGamepad width={20} height={20} />
        </span>
        <span className="big-tile-label">Gry</span>
      </button>

      <button type="button" className="big-tile big-tile-disabled" disabled>
        <span className="big-tile-icon">
          <IconBook width={20} height={20} />
        </span>
        <span className="big-tile-label">Książki</span>
        <span className="big-tile-note">wkrótce</span>
      </button>

      <button type="button" className="big-tile big-tile-disabled" disabled>
        <span className="big-tile-icon">
          <IconFilm width={20} height={20} />
        </span>
        <span className="big-tile-label">Filmy</span>
        <span className="big-tile-note">wkrótce</span>
      </button>

      <button type="button" className="big-tile big-tile-disabled" disabled>
        <span className="big-tile-icon">
          <IconMusic width={20} height={20} />
        </span>
        <span className="big-tile-label">Muzyka</span>
        <span className="big-tile-note">wkrótce</span>
      </button>
    </div>
  );
}
