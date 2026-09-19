"use client";

import { useState } from "react";
import { resolvePath } from "../lib/wizardTree.js";
import WizardStep from "./WizardStep.js";
import WizardEntrance from "./WizardEntrance.js";

export default function PhoneWizard() {
  const [answers, setAnswers] = useState({});
  // How many of the currently-valid steps are actually shown. resolvePath
  // already includes the next step the instant an answer is set, but the
  // capsule for it shouldn't slide out until the one above it has fully
  // finished settling - so revealing it is gated on that step's own
  // onSettled callback, not on resolvePath's output directly.
  const [revealedCount, setRevealedCount] = useState(1);

  const steps = resolvePath(answers);
  const visibleSteps = steps.slice(0, Math.min(revealedCount, steps.length));

  // Only ever touch the one node being changed. resolvePath validates every
  // stored answer against that node's CURRENT options on every call, so a
  // later node whose options don't depend on this one just keeps matching
  // and survives untouched — no need to guess here which downstream nodes
  // are "still valid" and which need to be wiped.
  function handleAnswer(nodeId, optionId) {
    setAnswers((prev) => ({ ...prev, [nodeId]: optionId }));
  }

  function handleReopen(nodeId) {
    const idx = steps.findIndex((s) => s.id === nodeId);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    if (idx >= 0) setRevealedCount(idx + 1);
  }

  function handleRestart() {
    setAnswers({});
    setRevealedCount(1);
  }

  return (
    <div className="flex flex-col">
      {visibleSteps.map((s, i) =>
        s.id === "wynik" ? (
          <WizardEntrance key="wynik" className={`wizard-row${i === 0 ? " wizard-row-first" : ""}`}>
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
          </WizardEntrance>
        ) : (
          <WizardStep
            key={s.id}
            step={s}
            isFirst={i === 0}
            onAnswer={(optionId) => handleAnswer(s.id, optionId)}
            onReopen={() => handleReopen(s.id)}
            onSettled={() => setRevealedCount((n) => n + 1)}
          />
        )
      )}
    </div>
  );
}
