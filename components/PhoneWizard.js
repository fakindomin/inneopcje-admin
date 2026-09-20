"use client";

import { useRef, useState } from "react";
import { resolvePath } from "../lib/wizardTree.js";
import WizardStep from "./WizardStep.js";
import WizardHeightReveal from "./WizardHeightReveal.js";

export default function PhoneWizard() {
  const [answers, setAnswers] = useState({});
  // How many of the currently-valid steps are actually shown. resolvePath
  // already includes the next step the instant an answer is set, but the
  // capsule for it shouldn't slide out until the one above it has fully
  // finished settling - so revealing it is gated on that step's own
  // onSettled callback, not on resolvePath's output directly.
  const [revealedCount, setRevealedCount] = useState(1);
  // Ids of steps currently retracting back under the one being reopened,
  // in the order they'll retract: the front of the array is always the
  // one CURRENTLY playing its exit animation (always the last still-shown
  // step, since they retract one at a time, working backward - the same
  // one-at-a-time pacing the forward reveal uses, just in reverse).
  const [retractQueue, setRetractQueue] = useState([]);
  const reopenTargetRef = useRef(null);

  const steps = resolvePath(answers);
  const visibleSteps = steps.slice(0, Math.min(revealedCount, steps.length));
  const exitingId = retractQueue[0] ?? null;
  const busy = retractQueue.length > 0;

  // Only ever touch the one node being changed. resolvePath validates every
  // stored answer against that node's CURRENT options on every call, so a
  // later node whose options don't depend on this one just keeps matching
  // and survives untouched — no need to guess here which downstream nodes
  // are "still valid" and which need to be wiped.
  function handleAnswer(nodeId, optionId) {
    if (busy) return;
    setAnswers((prev) => ({ ...prev, [nodeId]: optionId }));
  }

  // Reopening an earlier step has to look like the reveal played backward:
  // whatever came after it retracts first - one step at a time, starting
  // from the LAST one currently shown - and only once every one of them
  // has fully slid back under the step above it does that step itself
  // un-settle back into an active question. The steps being retracted are
  // still fully present in `steps` at this point (answers hasn't changed
  // yet), so there's nothing to snapshot - just shrink `revealedCount` by
  // one each time a retraction finishes, in step with the queue.
  function handleReopen(nodeId) {
    if (busy) return;
    const idx = steps.findIndex((s) => s.id === nodeId);
    if (idx < 0) return;

    const toRetract = steps.slice(idx + 1, revealedCount);
    if (toRetract.length === 0) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      return;
    }

    reopenTargetRef.current = nodeId;
    setRetractQueue(toRetract.map((s) => s.id).reverse());
  }

  function handleRetracted() {
    setRevealedCount((n) => n - 1);
    setRetractQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0) {
        const nodeId = reopenTargetRef.current;
        reopenTargetRef.current = null;
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
      }
      return rest;
    });
  }

  function handleRestart() {
    setAnswers({});
    setRevealedCount(1);
    setRetractQueue([]);
  }

  return (
    <div className="flex flex-col">
      {visibleSteps.map((s, i) =>
        s.id === "wynik" ? (
          <WizardHeightReveal
            key="wynik"
            className={`wizard-row${i === 0 ? " wizard-row-first" : ""}`}
            exiting={s.id === exitingId}
            onExited={handleRetracted}
          >
            <div className="flex flex-col items-center">
              <div className="wizard-dot wizard-dot-result" />
            </div>
            <div className="wizard-body" style={{ borderColor: "#E4572E" }}>
              <p className="text-sm font-medium text-brand-ink mb-1">Gotowe — tu pojawi się dopasowany telefon</p>
              <p className="text-xs text-brand-muted">
                (Placeholder — ten prototyp nie jest jeszcze podpięty pod prawdziwą bazę produktów. Chodzi na razie
                o sam mechanizm i wygląd.)
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="mt-3 text-xs px-3 py-1.5 rounded-md border border-brand-border hover:bg-brand-cream"
              >
                Zacznij od nowa
              </button>
            </div>
          </WizardHeightReveal>
        ) : (
          <WizardStep
            key={s.id}
            step={s}
            isFirst={i === 0}
            onAnswer={(optionId) => handleAnswer(s.id, optionId)}
            onReopen={() => handleReopen(s.id)}
            onSettled={() => setRevealedCount((n) => n + 1)}
            exiting={s.id === exitingId}
            onExited={handleRetracted}
          />
        )
      )}
    </div>
  );
}
