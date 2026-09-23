"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// How long the exit motion plays before the actual navigation fires - kept
// in sync with the CSS transition duration below (app/globals.css's
// .page-slide rule), same "animate first, change state after" pattern
// already used for reopening an earlier wizard step (see
// components/PhoneWizard.js's handleReopen/retractingIds).
const TRANSITION_MS = 360;

// Gives a page's content a slide+fade entrance on mount, and hands its
// children a `navigate(href)` function that plays the same motion in
// reverse - up and out - before actually changing the route. Used across
// the homepage's tile flow (app/page.js -> app/wybierz/page.js ->
// app/wybierz/telefony/page.js, and app/szukaj/page.js) so a tapped tile
// visibly leaves before whatever replaces it arrives, instead of the
// browser just snapping to the next page.
export default function PageSlide({ children, className }) {
  const [phase, setPhase] = useState("entering"); // entering -> entered -> exiting
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("entered"));
    return () => cancelAnimationFrame(raf);
  }, []);

  function navigate(href) {
    if (phase === "exiting") return;
    setPhase("exiting");
    setTimeout(() => router.push(href), TRANSITION_MS);
  }

  return (
    <div className={`page-slide page-slide-${phase}${className ? ` ${className}` : ""}`}>
      {typeof children === "function" ? children(navigate) : children}
    </div>
  );
}
