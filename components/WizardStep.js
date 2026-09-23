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
  if (step.multiSelect) {
    return (
      <MultiSelectWizardStep
        step={step}
        isFirst={isFirst}
        onAnswer={onAnswer}
        onReopen={onReopen}
        onSettled={onSettled}
        exiting={exiting}
        onExited={onExited}
      />
    );
  }

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
            return (
              <button
                key={o.id}
                type="button"
                // NOT disabled once chosen: a disabled button swallows its
                // click instead of letting it bubble, so a click landing
                // squarely on the answer text (very likely, since it's the
                // most prominent thing in the capsule) would never reach
                // the body's reopen handler. Wiring its own click straight
                // to onReopen keeps the same element interactive for the
                // capsule's entire life instead.
                style={isLeaving ? { transitionDelay: `${leavingIndex * 40}ms` } : undefined}
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

// Separate, deliberately simpler component for a multi-select step
// (currently just "producent", up to `step.maxSelect` picks) - the
// single-select choreography above is built entirely around exactly one
// chosen option morphing into the answered capsule, and multi-select needs
// a different interaction (toggle several, then an explicit confirm)
// rather than "tap = answered", so it isn't reused here.
function MultiSelectWizardStep({ step, isFirst, onAnswer, onReopen, onSettled, exiting, onExited }) {
  const answered = Boolean(step.answer);
  const [selected, setSelected] = useState(() => (Array.isArray(step.answer) ? step.answer : []));
  const settledRef = useRef(false);

  // Same "already answered on mount, or freshly reopened" bookkeeping the
  // single-select version needs (see its own onSettled effect above) -
  // onSettled must fire exactly once per answer, and reopening (step.answer
  // going back to null) needs the checkboxes to start over from empty.
  useEffect(() => {
    if (step.answer) {
      if (!settledRef.current) {
        settledRef.current = true;
        onSettled();
      }
      setSelected(step.answer);
    } else {
      settledRef.current = false;
      setSelected([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.answer]);

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= step.maxSelect) return prev;
      return [...prev, id];
    });
  }

  function handleReopenKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onReopen();
    }
  }

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
        {answered ? (
          <p className="wizard-option chosen">
            {step.options
              .filter((o) => step.answer.includes(o.id))
              .map((o) => o.label)
              .join(", ")}
          </p>
        ) : (
          <>
            <div className="wizard-options">
              {step.options.map((o) => {
                const isChecked = selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`wizard-option${isChecked ? " multi-checked" : ""}`}
                    onClick={() => toggle(o.id)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => onAnswer(selected)}
              className="text-xs px-3 py-1.5 mt-1.5 rounded-md border border-brand-border hover:bg-brand-cream disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
            >
              Zatwierdź ({selected.length}/{step.maxSelect})
            </button>
          </>
        )}
      </div>
    </WizardHeightReveal>
  );
}
