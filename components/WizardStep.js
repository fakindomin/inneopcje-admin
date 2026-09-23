"use client";

import { useEffect, useRef, useState } from "react";
import WizardHeightReveal from "./WizardHeightReveal.js";

// One step, one persistent element for its whole life: it mounts once, as
// an active question, and later morphs in place into its compact
// "answered" capsule when `step.answer` is set - the dot fills, the
// question shrinks into a caption, the unchosen options fade away, and the
// chosen one loses its border/background and becomes the bold answer
// line. Nothing here is ever torn down and rebuilt as something else, so
// there's no hand-off seam between "question" and "answered chip".
//
// Reopening (step.answer going from set back to null) plays the same
// choreography in reverse: the dot and question un-transition for free
// since they're driven by the same CSS classes either way, but the
// removed options need to be explicitly brought back with an "entering"
// version of the leaving animation, not just snapped back into existence.
//
// `exiting`/`onExited` let the PARENT retract this step out of the list
// entirely (used when reopening an EARLIER step invalidates this one) -
// see WizardHeightReveal for the shrink-to-nothing animation itself.
//
// The body can't be a native <button> (it needs to host the chosen
// option, itself a <button>, for the whole rest of its life) so reopening
// uses a keyboard-accessible div instead.
export default function WizardStep({ step, isFirst, onAnswer, onReopen, onSettled, exiting, onExited }) {
  const prevAnswerRef = useRef(step.answer);
  const [answered, setAnswered] = useState(Boolean(step.answer));
  const [chosenId, setChosenId] = useState(step.answer || null);
  const [leavingIds, setLeavingIds] = useState([]);
  // A step can mount ALREADY answered: resolvePath keeps an earlier answer
  // to this node when it's still valid even after an unrelated upstream
  // answer changes (see wizardTree.js), so this step never goes through
  // the null-\>set transition below at all - it just shows up pre-settled.
  // Without this, the settle effect (which is what normally populates
  // removedIds) never runs, and the other options sit there fully
  // rendered forever underneath an otherwise-compact "answered" capsule.
  const [removedIds, setRemovedIds] = useState(() =>
    step.answer ? step.options.filter((o) => o.id !== step.answer).map((o) => o.id) : []
  );

  // All options in an unanswered step should read as one uniform row of
  // tiles, whatever their own text needs - a short "Bateria" sitting next
  // to a two-line option looks like a layout bug even though neither is
  // wrong on its own. Measured off the real DOM (scrollHeight reports an
  // element's true, un-clipped content height regardless of its own
  // max-height/overflow) rather than a hardcoded guess, since which
  // options wrap depends on both the text and the viewport width -
  // re-measured on resize for the same reason.
  const optionRefs = useRef({});
  const [uniformHeight, setUniformHeight] = useState(null);
  useEffect(() => {
    function measure() {
      // offsetHeight (not scrollHeight) so the measured value already
      // includes the border - min-height is applied border-box, so a
      // content-only number would leave the tallest option 2px taller
      // than everything else it's supposed to match. max-height is
      // cleared first since it's what would otherwise clamp this exact
      // element's own natural height.
      const heights = step.options
        .map((o) => optionRefs.current[o.id])
        .filter(Boolean)
        .map((el) => {
          const prevMaxHeight = el.style.maxHeight;
          el.style.maxHeight = "none";
          const h = el.offsetHeight;
          el.style.maxHeight = prevMaxHeight;
          return h;
        })
        .filter((h) => h > 0);
      if (heights.length > 0) setUniformHeight(Math.max(...heights));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same "mounts already answered" case as above, different consequence:
  // onSettled is otherwise only called from the live settle transition
  // below, which never runs here either (no null-\>set change to catch) -
  // so without this, the parent never learns this step is done and the
  // next one never reveals. The whole wizard just stops advancing, with
  // no visible error, the moment a reopened answer changes something that
  // makes resolvePath skip straight past one or more preserved-but-valid
  // later answers.
  useEffect(() => {
    if (step.answer) onSettled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevAnswer = prevAnswerRef.current;
    prevAnswerRef.current = step.answer;

    if (!prevAnswer && step.answer) {
      // just answered: settle everything at once - the browser
      // interpolates the dot's fill, the question's shrink, the chosen
      // option's turn into plain text, and the others' exit together
      const others = step.options.filter((o) => o.id !== step.answer).map((o) => o.id);
      setChosenId(step.answer);
      setLeavingIds(others);
      setAnswered(true);

      const settleMs = Math.max(340, others.length ? (others.length - 1) * 40 + 340 : 0);
      const timer = setTimeout(() => {
        setRemovedIds(others);
        onSettled();
      }, settleMs);
      return () => clearTimeout(timer);
    }

    if (prevAnswer && !step.answer) {
      // reopened: the dot/question/chosen-option morph reverses for free
      // (same classes, same transitions, just toggled off), but the
      // options that were removed from the DOM need to be brought back
      // and given their own "entering" run of the leaving animation - put
      // them back already in the collapsed "leaving" look, then release
      // that on the next frame so they visibly un-collapse into place,
      // instead of just popping back at full size.
      const returning = step.options.filter((o) => o.id !== prevAnswer).map((o) => o.id);
      setAnswered(false);
      setChosenId(null);
      setRemovedIds([]);
      setLeavingIds(returning);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLeavingIds([]);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.answer]);

  function handleReopenKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onReopen();
    }
  }

  const visibleOptions = step.options.filter((o) => !removedIds.includes(o.id));

  return (
    <WizardHeightReveal
      className={`wizard-row${isFirst ? " wizard-row-first" : ""}${answered ? " answered" : ""}`}
      exiting={exiting}
      onExited={onExited}
    >
      <div className="flex flex-col items-center">
        <div className="wizard-dot" />
        <div className="wizard-line" />
      </div>
      <div
        className="wizard-body"
        role={answered ? "button" : undefined}
        tabIndex={answered ? 0 : undefined}
        onClick={answered ? onReopen : undefined}
        onKeyDown={answered ? handleReopenKeyDown : undefined}
      >
        <p className="wizard-question">{step.question}</p>
        <div className="wizard-options">
          {visibleOptions.map((o) => {
            const leavingIndex = leavingIds.indexOf(o.id);
            const isLeaving = leavingIndex !== -1;
            const isChosen = o.id === chosenId;
            // Uniform height only applies while the tiles are still being
            // chosen among - a leaving option needs its min-height cleared
            // too, or it would fight the max-height:0 collapse (min-height
            // wins that conflict per the CSS spec) and never shrink away.
            const style = {};
            if (isLeaving) style.transitionDelay = `${leavingIndex * 40}ms`;
            if (!answered && !isLeaving && uniformHeight) style.minHeight = `${uniformHeight}px`;
            return (
              <button
                key={o.id}
                ref={(el) => {
                  optionRefs.current[o.id] = el;
                }}
                type="button"
                // NOT disabled once chosen: a disabled button swallows its
                // click instead of letting it bubble, so a click landing
                // squarely on the answer text (very likely, since it's the
                // most prominent thing in the capsule) would never reach
                // the body's reopen handler. Wiring its own click straight
                // to onReopen keeps the same element interactive for the
                // capsule's entire life instead.
                style={Object.keys(style).length ? style : undefined}
                className={`wizard-option${isChosen ? " chosen" : ""}${isLeaving ? " leaving" : ""}`}
                onClick={isChosen && answered ? onReopen : () => onAnswer(o.id)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </WizardHeightReveal>
  );
}
