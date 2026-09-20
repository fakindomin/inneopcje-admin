"use client";

import { useLayoutEffect, useRef } from "react";

// Grows a clipping wrapper's real `height` from 0 up to the wrapped
// content's own natural size on mount, and - given `exiting` - shrinks it
// back down to 0 before the caller actually removes this component. Height
// is a layout property, so every ancestor's own auto-height (this wizard's
// list, the page it lives on) tracks the change frame by frame instead of
// jumping straight to the new size while only the content inside visibly
// animates.
//
// `.wizard-row-collapse` (app/globals.css) also pins the content to the
// BOTTOM of the window via `justify-content: flex-end`, so on the way in
// the row's own bottom edge is revealed first and its top (the question)
// last; on the way out - the same wrapper, played backward - the question
// is the first thing to disappear and the bottom edge lingers until the
// very end. Reopening an earlier step should look like this animation run
// in reverse, so both directions live in one component instead of two.
//
// Both effects release/finish on the actual CSS `transitionend`, with a
// timer as a fallback, rather than trusting a fixed setTimeout alone: React
// (Strict Mode in particular, which Next.js turns on by default, even
// though the double-invoke behavior itself is dev-only) can mount, clean
// up, and re-run an effect before its timer fires, cancelling it for good
// with no second chance - which is exactly how a previous version of this
// component ended up with wrappers permanently stuck at a stale pixel
// height, invisibly overlapping the row below and stealing its clicks.
// Keying the release off the transition itself, and guarding re-entrancy
// by checking the CURRENT height rather than a "ran once" ref, makes every
// invocation - however many times React fires it - converge on the same
// correct end state instead of leaving it half-finished.
export default function WizardHeightReveal({ children, className, exiting, onExited }) {
  const collapseRef = useRef(null);
  const innerRef = useRef(null);

  useLayoutEffect(() => {
    if (exiting) return;
    const collapse = collapseRef.current;
    const inner = innerRef.current;
    if (!collapse || !inner) return;

    // a previous invocation already finished the entrance - don't replay
    // the grow-in from scratch (this is what makes re-invocation safe)
    if (collapse.style.height === "auto") return;

    // the gap to the row above (margin-top) has to be inside the animated
    // window too, or it just snaps in uncontrolled once the transition ends
    const marginTop = parseFloat(getComputedStyle(inner).marginTop) || 0;
    const target = inner.getBoundingClientRect().height + marginTop;

    const raf = requestAnimationFrame(() => {
      collapse.style.height = target + "px";
    });

    function finish() {
      collapse.removeEventListener("transitionend", onTransitionEnd);
      clearTimeout(fallback);
      // release back to auto so later size changes (e.g. this same row
      // settling into its compact "answered" shape) aren't constrained by
      // a stale pixel value from the entrance - unless an exit already
      // started and is now shrinking it back down, which this must not clobber
      if (collapse.style.height !== "0px") collapse.style.height = "auto";
    }
    function onTransitionEnd(e) {
      if (e.target === collapse && e.propertyName === "height") finish();
    }
    collapse.addEventListener("transitionend", onTransitionEnd);
    const fallback = setTimeout(finish, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      collapse.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [exiting]);

  useLayoutEffect(() => {
    if (!exiting) return;
    const collapse = collapseRef.current;
    const inner = innerRef.current;
    if (!collapse || !inner) return;

    const marginTop = parseFloat(getComputedStyle(inner).marginTop) || 0;
    const startHeight = inner.getBoundingClientRect().height + marginTop;
    collapse.style.height = startHeight + "px";
    collapse.getBoundingClientRect(); // commit the starting height before animating away

    const raf = requestAnimationFrame(() => {
      collapse.style.height = "0px";
    });

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      collapse.removeEventListener("transitionend", onTransitionEnd);
      clearTimeout(fallback);
      onExited?.();
    }
    function onTransitionEnd(e) {
      if (e.target === collapse && e.propertyName === "height") finish();
    }
    collapse.addEventListener("transitionend", onTransitionEnd);
    const fallback = setTimeout(finish, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      collapse.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [exiting]);

  return (
    <div ref={collapseRef} className="wizard-row-collapse">
      <div ref={innerRef} className={className}>
        {children}
      </div>
    </div>
  );
}
