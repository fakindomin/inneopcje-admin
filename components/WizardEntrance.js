"use client";

import { useLayoutEffect, useRef } from "react";

// Grows a clipping wrapper's real `height` from 0 up to the wrapped
// content's own natural size, once, on mount. Height is a layout property,
// so every ancestor's own auto-height (this wizard's list, the page it
// lives on) tracks the growth frame by frame instead of jumping straight
// to the final size while only the content inside visibly animates.
//
// `.wizard-row-collapse` (app/globals.css) also pins the content to the
// BOTTOM of the growing window via `justify-content: flex-end`, so the
// row's own bottom edge is revealed first and its top (the question)
// last - it reads as sliding out from under whatever sits above it,
// rather than unmasking top-down in place.
export default function WizardEntrance({ children, className }) {
  const collapseRef = useRef(null);
  const innerRef = useRef(null);

  useLayoutEffect(() => {
    const collapse = collapseRef.current;
    const inner = innerRef.current;
    if (!collapse || !inner) return;

    // the gap to the row above (margin-top) has to be inside the animated
    // window too, or it just snaps in uncontrolled once the transition ends
    const marginTop = parseFloat(getComputedStyle(inner).marginTop) || 0;
    const target = inner.getBoundingClientRect().height + marginTop;

    const raf = requestAnimationFrame(() => {
      collapse.style.height = target + "px";
    });
    const timer = setTimeout(() => {
      // release back to auto so later size changes (e.g. this same row
      // settling into its compact "answered" shape) aren't constrained by
      // a stale pixel value from the entrance
      if (collapseRef.current) collapseRef.current.style.height = "auto";
    }, 440);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // run once, on mount, only - this is the entrance, not a resize observer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={collapseRef} className="wizard-row-collapse">
      <div ref={innerRef} className={className}>
        {children}
      </div>
    </div>
  );
}
