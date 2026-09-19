"use client";

import { useEffect, useRef, useState } from "react";
import WizardEntrance from "./WizardEntrance.js";

// One step, one persistent element for its whole life: it mounts once, as
// an active question, and later morphs in place into its compact
// "answered" capsule when `step.answer` is set - the dot fills, the
// question shrinks into a caption, the unchosen options fade away, and the
// chosen one loses its border/background and becomes the bold answer
// line. Nothing here is ever torn down and rebuilt as something else, so
// there's no hand-off seam between "question" and "answered chip".
//
// The body can't be a native <button> (it needs to host the chosen
// option, itself a <button>, for the whole rest of its life) so reopening
// uses a keyboard-accessible div instead.
export default function WizardStep({ step, isFirst, onAnswer, onReopen, onSettled }) {
  const prevAnswerRef = useRef(step.answer);
  const [answered, setAnswered] = useState(Boolean(step.answer));
  const [chosenId, setChosenId] = useState(step.answer || null);
  const [leavingIds, setLeavingIds] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);

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
      // reopened: back to a plain active question, options rebuilt fresh
      setAnswered(false);
      setChosenId(null);
      setLeavingIds([]);
      setRemovedIds([]);
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
    <WizardEntrance
      className={`wizard-row${isFirst ? " wizard-row-first" : ""}${answered ? " answered" : ""}`}
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
    </WizardEntrance>
  );
}
