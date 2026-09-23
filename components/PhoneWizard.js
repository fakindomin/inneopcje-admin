"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resolvePath } from "../lib/wizardTree.js";
import WizardStep from "./WizardStep.js";
import WizardHeightReveal from "./WizardHeightReveal.js";
import VerdictCard from "./VerdictCard.js";
import { IconShuffle, IconRefresh } from "./icons.js";

export default function PhoneWizard() {
  const [answers, setAnswers] = useState({});
  // How many of the currently-valid steps are actually shown. resolvePath
  // already includes the next step the instant an answer is set, but the
  // capsule for it shouldn't slide out until the one above it has fully
  // finished settling - so revealing it is gated on that step's own
  // onSettled callback, not on resolvePath's output directly.
  const [revealedCount, setRevealedCount] = useState(1);
  // Ids of every step currently retracting back under the one being
  // reopened - all of them AT ONCE, as a single block, rather than one at
  // a time: it's quicker, and everything that's about to disappear is
  // equally invalidated by the same reopened answer, so there's no reason
  // for it to leave in stages.
  const [retractingIds, setRetractingIds] = useState([]);
  const reopenTargetRef = useRef(null);

  // null = still loading. Fetched once up front rather than per-render:
  // the "producent" step needs to know which brands the catalog actually
  // carries in each price tier (see lib/wizardBrands.js), and
  // "rozmiar_ekranu" needs to know whether that tier's recent catalog even
  // spans a real screen-size range (see lib/wizardScreenRange.js), before
  // either can offer/ask real options instead of stale/dishonest ones.
  const [producentByTier, setProducentByTier] = useState(null);
  const [screenRangeByTier, setScreenRangeByTier] = useState(null);

  useEffect(() => {
    fetch("/api/wizard-brands")
      .then((r) => r.json())
      .then((data) => {
        setProducentByTier(data.producentByTier ?? {});
        setScreenRangeByTier(data.screenRangeByTier ?? {});
      })
      .catch(() => {
        setProducentByTier({});
        setScreenRangeByTier({});
      });
  }, []);

  // Rendering never waits on this fetch: only "producent" and
  // "rozmiar_ekranu" (several answers deep) actually need real
  // producentByTier/screenRangeByTier data - resolvePath already treats
  // {} as "nothing to offer yet" for both (skips/asks-anyway rather than
  // erroring), so the first questions show immediately with the fetch
  // filling in behind them instead of a blank "Ładowanie…" screen for
  // data nobody needs yet.
  const steps = resolvePath(answers, producentByTier ?? {}, screenRangeByTier ?? {});
  const visibleSteps = steps.slice(0, Math.min(revealedCount, steps.length));
  const busy = retractingIds.length > 0;
  const showResult = visibleSteps.some((s) => s.id === "wynik");

  // The further into the wizard someone gets, the more likely the newly
  // revealed (or reopened) question lands below the fold - nothing used to
  // bring it into view, so scrolling was entirely on the visitor. Each
  // step's wrapper registers itself here by id; the effect below scrolls
  // whichever one is CURRENTLY ACTIVE (index revealedCount-1) into view -
  // depending on its id rather than the `steps` array (a new array every
  // render) so this only fires when that actually changes, not on every
  // unrelated re-render (price/live-count fetches, etc).
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
    // The newly-mounted row's own height-reveal animation (see
    // WizardHeightReveal) grows from ~0 over ~420ms - scrolling before that
    // finishes measures a still-collapsed element, so `block: "nearest"`
    // sees it as trivially "already in view" and does nothing. Waiting the
    // same ~500ms WizardHeightReveal itself already treats as "safe" (its
    // own transitionend fallback) lets this measure the row at its real,
    // settled size.
    const timer = setTimeout(() => {
      stepRefs.current.get(currentStepId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 480);
    return () => clearTimeout(timer);
  }, [currentStepId]);

  // Only used to build the "Zobacz pełne zestawienie" link's ?wprofile=
  // param below - the wizard itself never renders anything from this, it
  // just hands the profile to the product page (app/produkt/[slug]/page.js)
  // so IT can prefer picks from the other selected brands, one click away,
  // same as today - see lib/wizardMatch.js's otherBrandPicksForProduct.
  const wynikProfile = steps.find((s) => s.id === "wynik")?.profile;

  // undefined = fetching, null = fetched but no match, object = matched
  // product. Keyed off `answers`' own identity (a new object every time it
  // actually changes) rather than a boolean, so a Strict-Mode re-invoke of
  // this effect with the same answers is a genuine no-op instead of
  // re-firing the request.
  const [match, setMatch] = useState(undefined);
  const fetchedForRef = useRef(null);

  useEffect(() => {
    if (!showResult || fetchedForRef.current === answers) return;
    fetchedForRef.current = answers;
    setMatch(undefined);
    fetch("/api/wizard-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
      .then((r) => r.json())
      .then((data) => setMatch(data.product ?? null))
      .catch(() => setMatch(null));
  }, [showResult, answers]);

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
  // everything that came after it retracts together, as one block, and
  // only once ALL of them have finished sliding back under the step above
  // does that step itself un-settle back into an active question. The
  // steps being retracted are still fully present in `steps` at this
  // point (answers hasn't changed yet), so there's nothing to snapshot -
  // revealedCount and answers both update in one go once every retraction
  // in the batch has reported back.
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

  // Just the pure state transition here - dropping one id from the batch.
  // The actual finalize (clearing the reopened answer, restoring
  // revealedCount) is a side effect, so it lives in the effect below
  // instead of inside this updater: Strict Mode calls updater functions
  // twice to catch exactly this mistake, and it did - the ref this used to
  // clear right here read back as already-null on the second call, which
  // silently computed an index of -1 and zeroed the whole visible list.
  function handleRetracted(stepId) {
    setRetractingIds((ids) => ids.filter((id) => id !== stepId));
  }

  // Fires once the batch actually empties. Guarded on the ref rather than
  // on retractingIds alone so a Strict-Mode-style extra invocation is a
  // genuine no-op (ref already null) instead of redoing the finalize with
  // stale data.
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
                      Nie mamy jeszcze telefonu w tym segmencie
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
                      <Link
                        href={
                          Array.isArray(wynikProfile?.producent) && wynikProfile.producent.length > 1
                            ? `/produkt/${match.slug}?wprofile=${encodeURIComponent(JSON.stringify(wynikProfile))}`
                            : `/produkt/${match.slug}`
                        }
                        className="big-tile big-tile-compact"
                      >
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
