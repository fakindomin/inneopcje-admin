"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// How long the exit motion plays before the actual navigation fires.
// Deliberately SHORTER than the CSS transition's own 420ms duration
// (app/globals.css's .page-slide rule) - waiting for the literal last
// frame left a visible gap of nothing on screen before the next page's
// own entrance could start. The easing curve (cubic-bezier(0.22, 1, 0.36,
// 1)) does almost all of its visual movement in the first ~60% of the
// transition, so by this point the outgoing content already reads as
// gone; firing the navigation here lets the incoming screen's entrance
// begin immediately, overlapping the tail of the exit instead of waiting
// it out.
const NAVIGATE_DELAY_MS = 260;

// keyed by pathname: Next.js's client-side router cache can restore a
// previously-visited page (browser back/forward, or a plain <Link> back to
// it) without actually remounting the component tree, which meant the
// entrance animation - driven by a mount effect - simply never replayed.
// Keying on the CURRENT pathname forces React to treat every distinct URL
// as a fresh instance of PageSlideInner regardless of what Next's own
// cache does underneath, so the entrance always plays on every arrival,
// however it happened.
export default function PageSlide(props) {
  const pathname = usePathname();
  return <PageSlideInner key={pathname} {...props} />;
}

// `footer` is for content that should trigger the SAME exit-then-navigate
// sequence (e.g. a "← Strona główna" back link) without being part of the
// sliding block itself - rendered outside the animated wrapper, but still
// handed the same `navigate` function as `children`.
function PageSlideInner({ children, footer, className }) {
  const [phase, setPhase] = useState("entering"); // entering -> entered -> exiting
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("entered"));
    return () => cancelAnimationFrame(raf);
  }, []);

  function navigate(href) {
    if (phase === "exiting") return;

    // A fixed exit distance can't be trusted to fully clear the top edge -
    // this catalog of tiles is meant to grow, and taller content would get
    // cut off mid-slide the instant the next page mounts. Measuring the
    // element's own current bottom edge (its distance from the viewport
    // top) is exactly how far it needs to travel to be fully hidden above
    // it, whatever its real height turns out to be - same reasoning as
    // WizardHeightReveal measuring its own content instead of guessing.
    const el = ref.current;
    if (el) {
      const distance = Math.ceil(el.getBoundingClientRect().bottom) + 24;
      el.style.setProperty("--page-slide-exit-distance", `${distance}px`);
    }

    setPhase("exiting");
    setTimeout(() => router.push(href), NAVIGATE_DELAY_MS);
  }

  return (
    <>
      <div ref={ref} className={`page-slide page-slide-${phase}${className ? ` ${className}` : ""}`}>
        {typeof children === "function" ? children(navigate) : children}
      </div>
      {typeof footer === "function" ? footer(navigate) : footer}
    </>
  );
}
