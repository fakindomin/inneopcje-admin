"use client";

import { useState } from "react";
import { resolvePath } from "../lib/wizardTree.js";

export default function PhoneWizard() {
  const [answers, setAnswers] = useState({});
  const steps = resolvePath(answers);

  function handleAnswer(nodeId, optionId) {
    // Answering a node only ever needs to clear ITS OWN old answer plus
    // anything that was answered after it in the previous render — since
    // resolvePath recomputes from scratch each time, simply dropping every
    // key from this node onward and re-adding this one answer is enough;
    // any node that's still reachable via a different route just gets
    // re-asked (this prototype doesn't yet implement convergent-answer
    // reuse — see project_wizard_flowchart memory).
    const idx = steps.findIndex((s) => s.id === nodeId);
    const keepIds = steps.slice(0, idx).map((s) => s.id);
    const next = {};
    for (const id of keepIds) next[id] = answers[id];
    next[nodeId] = optionId;
    setAnswers(next);
  }

  function handleReopen(nodeId) {
    const idx = steps.findIndex((s) => s.id === nodeId);
    const keepIds = steps.slice(0, idx).map((s) => s.id);
    const next = {};
    for (const id of keepIds) next[id] = answers[id];
    setAnswers(next);
  }

  function handleRestart() {
    setAnswers({});
  }

  const answeredSteps = steps.filter((s) => s.answer && s.id !== "wynik");
  const activeStep = steps.find((s) => !s.answer);
  const isDone = steps.some((s) => s.id === "wynik");

  return (
    <div className="flex flex-col gap-3">
      {answeredSteps.map((s, i) => {
        const chosen = s.options.find((o) => o.id === s.answer);
        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-orange shrink-0 mt-1" />
              {(i < answeredSteps.length - 1 || activeStep || isDone) && (
                <div className="w-px flex-1 bg-brand-border mt-1" />
              )}
            </div>
            <button
              type="button"
              onClick={() => handleReopen(s.id)}
              className="text-left border border-brand-border rounded-md px-3 py-2 mb-1 bg-white hover:border-brand-orange transition-colors flex-1"
            >
              <p className="text-[11px] text-brand-muted">{s.question}</p>
              <p className="text-sm text-brand-ink font-medium">{chosen?.label}</p>
            </button>
          </div>
        );
      })}

      {activeStep && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-orange shrink-0 mt-1" />
          </div>
          <div className="border border-brand-border rounded-lg p-4 bg-white flex-1">
            <p className="text-sm font-medium text-brand-ink mb-3">{activeStep.question}</p>
            <div className="flex flex-col gap-2">
              {activeStep.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleAnswer(activeStep.id, o.id)}
                  className="text-left text-sm border border-brand-border rounded-md px-3 py-2 hover:border-brand-orange hover:bg-brand-cream/60 transition-colors"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDone && (
        <div className="border border-brand-orange rounded-lg p-4 bg-white">
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
      )}
    </div>
  );
}
