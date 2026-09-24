"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resolvePath } from "../lib/wizardTreeTv.js";
import WizardStep from "./WizardStep.js";
import WizardHeightReveal from "./WizardHeightReveal.js";
import VerdictCard from "./VerdictCard.js";
import { IconShuffle, IconRefresh } from "./icons.js";

// Mirrors components/PhoneWizard.js's reveal/reopen/retract choreography
// and its /api/wizard-match call - see that file for the full reasoning.
// Two deliberate differences from it: no live producent/screen-range fetch
// (lib/wizardTreeTv.js's producent list is the static ALLOWED_BRANDS, not a
// per-tier catalog lookup), and "Inna Opcja" never appends ?wprofile= - the
// product page's otherBrandPicksForProduct (lib/wizardMatch.js) is
// hardcoded to the telefony category, so passing a telewizory profile
// through it would silently rank phones as a TV's alternatives instead of
// erroring. Building a telewizory-aware equivalent is a separate task.
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

  const showResult = visibleSteps.some((s) => s.id === "wynik");

  // undefined = fetching, null = fetched but no match, object = matched
  // product. Same fetchedForRef-keyed-off-answers pattern as PhoneWizard.js
  // so a Strict-Mode re-invoke with the same answers is a no-op.
  const [match, setMatch] = useState(undefined);
  const fetchedForRef = useRef(null);

  useEffect(() => {
    if (!showResult || fetchedForRef.current === answers) return;
    fetchedForRef.current = answers;
    setMatch(undefined);
    fetch("/api/wizard-match-tv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
      .then((r) => r.json())
      .then((data) => setMatch(data.product ?? null))
      .catch(() => setMatch(null));
  }, [showResult, answers]);

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
    setMatch(undefined);
    fetchedForRef.current = null;
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
                {match === undefined && (
                  <div className="wizard-body" style={{ borderColor: "#E4572E" }}>
                    <p className="text-sm font-medium text-brand-ink">Szukam najlepszego dopasowania…</p>
                  </div>
                )}
                {match === null && (
                  <div className="wizard-body" style={{ borderColor: "#E4572E" }}>
                    <p className="text-sm font-medium text-brand-ink mb-1">
                      Nie mamy jeszcze telewizora w tym segmencie
                    </p>
                    <p className="text-xs text-brand-muted mb-3">Spróbuj zmienić wcześniejsze odpowiedzi.</p>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="text-xs px-3 py-1.5 rounded-md border border-brand-border hover:bg-brand-cream"
                    >
                      Zacznij od nowa
                    </button>
                  </div>
                )}
                {match && (
                  <>
                    <VerdictCard product={match} />
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/produkt/${match.slug}`} className="big-tile big-tile-compact">
                        <span className="big-tile-icon">
                          <IconShuffle width={14} height={14} />
                        </span>
                        <span className="big-tile-label">Inna Opcja</span>
                      </Link>
                      <button type="button" onClick={handleRestart} className="big-tile big-tile-compact">
                        <span className="big-tile-icon">
                          <IconRefresh width={14} height={14} />
                        </span>
                        <span className="big-tile-label">Zacznij od nowa</span>
                      </button>
                    </div>
                  </>
                )}
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
