"use client";

import { useEffect, useRef, useState } from "react";
import { resolvePath } from "../lib/wizardTreeTv.js";
import WizardStep from "./WizardStep.js";
import WizardHeightReveal from "./WizardHeightReveal.js";
import { IconShuffle, IconRefresh } from "./icons.js";

// Preview-only: no live producent/screen-range data (lib/wizardTreeTv.js
// uses the static brand list directly) and no /api/wizard-match call at
// the end - this is purely the question flow and its resolved profile,
// for review before any real matching is wired up. Structurally a
// trimmed copy of components/PhoneWizard.js - see that file for the
// reveal/reopen/retract choreography this mirrors.
export default function TvWizard() {
  const [answers, setAnswers] = useState({});
  const [revealedCount, setRevealedCount] = useState(1);
  const [retractingIds, setRetractingIds] = useState([]);
  const reopenTargetRef = useRef(null);

  const steps = resolvePath(answers);
  const visibleSteps = steps.slice(0, Math.min(revealedCount, steps.length));
  const busy = retractingIds.length > 0;

  const stepRefs = useRef(new Map());
  function setStepRef(id) {
    return (el) => {
      if (el) stepRefs.current.set(id, el);
      else stepRefs.current.delete(id);
    };
  }
  const currentStepId = steps[revealedCount - 1]?.id;
  useEffect(() => {
    if (!currentStepId) return;
    const timer = setTimeout(() => {
      stepRefs.current.get(currentStepId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 480);
    return () => clearTimeout(timer);
  }, [currentStepId]);

  const wynikProfile = steps.find((s) => s.id === "wynik")?.profile;

  function handleAnswer(nodeId, optionId) {
    if (busy) return;
    setAnswers((prev) => ({ ...prev, [nodeId]: optionId }));
  }

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
    setRetractingIds(toRetract.map((s) => s.id));
  }

  function handleRetracted(stepId) {
    setRetractingIds((ids) => ids.filter((id) => id !== stepId));
  }

  useEffect(() => {
    if (retractingIds.length > 0 || !reopenTargetRef.current) return;
    const nodeId = reopenTargetRef.current;
    reopenTargetRef.current = null;
    const idx = steps.findIndex((s) => s.id === nodeId);
    setRevealedCount(idx + 1);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retractingIds]);

  function handleRestart() {
    setAnswers({});
    setRevealedCount(1);
    setRetractingIds([]);
  }

  return (
    <div className="flex flex-col">
      {visibleSteps.map((s, i) =>
        s.id === "wynik" ? (
          <div key="wynik" ref={setStepRef("wynik")}>
            <WizardHeightReveal
              className={`wizard-row${i === 0 ? " wizard-row-first" : ""}`}
              exiting={retractingIds.includes(s.id)}
              onExited={() => handleRetracted(s.id)}
            >
              <div className="flex flex-col items-center">
                <div className="wizard-dot wizard-dot-result" />
              </div>
              <div className="flex-1">
                <div className="wizard-body" style={{ borderColor: "#E4572E" }}>
                  <p className="text-sm font-medium text-brand-ink mb-1">
                    🧪 Podgląd: tu pojawi się dopasowany telewizor
                  </p>
                  <p className="text-xs text-brand-muted mb-3">
                    Baza telewizorów nie jest jeszcze podpięta do tej ankiety — poniżej widać, co ankieta by
                    przekazała do dopasowania.
                  </p>
                  <pre className="text-[11px] bg-brand-cream rounded-md p-2 overflow-x-auto mb-3">
                    {JSON.stringify(wynikProfile, null, 2)}
                  </pre>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="big-tile big-tile-compact big-tile-disabled">
                      <span className="big-tile-icon">
                        <IconShuffle width={14} height={14} />
                      </span>
                      <span className="big-tile-label">Inna Opcja</span>
                    </div>
                    <button type="button" onClick={handleRestart} className="big-tile big-tile-compact">
                      <span className="big-tile-icon">
                        <IconRefresh width={14} height={14} />
                      </span>
                      <span className="big-tile-label">Zacznij od nowa</span>
                    </button>
                  </div>
                </div>
              </div>
            </WizardHeightReveal>
          </div>
        ) : (
          <div key={s.id} ref={setStepRef(s.id)}>
            <WizardStep
              step={s}
              isFirst={i === 0}
              onAnswer={(optionId) => handleAnswer(s.id, optionId)}
              onReopen={() => handleReopen(s.id)}
              onSettled={() => setRevealedCount((n) => n + 1)}
              exiting={retractingIds.includes(s.id)}
              onExited={() => handleRetracted(s.id)}
            />
          </div>
        )
      )}
    </div>
  );
}
