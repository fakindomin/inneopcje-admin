"use client";

import { useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { unpublishDuplicates } from "../app/admin/duplicate-cleanup/actions.js";

const FIELD_LABELS = [
  ["price_tier", "budżet"],
  ["score", "ocena"],
  ["chipset", "chipset"],
  ["battery_mah", "bateria (mAh)"],
  ["camera_main_mp", "aparat (MP)"],
  ["front_camera_mp", "aparat przedni (MP)"],
  ["charging_w", "ładowanie (W)"],
  ["screen_panel_type", "matryca"],
  ["weight_g", "waga (g)"],
  ["ip_rating", "IP"],
];

function Candidate({ c, checked, onToggle, isRecommendedKeep }) {
  return (
    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-brand-cream cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" />
      <div className="flex-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-brand-ink">{c.name}</span>
          <span className="text-brand-muted">({c.slug})</span>
          {isRecommendedKeep && (
            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px]">zachowaj</span>
          )}
          <span className="px-1.5 py-0.5 rounded-full bg-brand-cream text-[10px]">
            kompletność: {c.completeness}
          </span>
        </div>
        <div className="text-brand-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {FIELD_LABELS.map(([key, label]) => (
            <span key={key}>
              {label}: {c[key] === null || c[key] === undefined || c[key] === "" ? "—" : String(c[key])}
            </span>
          ))}
        </div>
      </div>
    </label>
  );
}

export default function DuplicateCleanupForm({ groups }) {
  const defaultChecked = useMemo(() => {
    const s = new Set();
    for (const g of groups) {
      if (g.verified?.verdict === "distinct") continue; // confirmed different phones, nothing to unpublish
      for (const c of g.candidates) {
        if (c.slug !== g.recommendedKeepSlug) s.add(c.slug);
      }
    }
    return s;
  }, [groups]);

  const [checkedSlugs, setCheckedSlugs] = useState(defaultChecked);
  const [state, formAction, pending] = useActionState(unpublishDuplicates, null);
  const formRef = useRef(null);

  function toggle(slug) {
    setCheckedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function skipGroup(group) {
    setCheckedSlugs((prev) => {
      const next = new Set(prev);
      for (const c of group.candidates) next.delete(c.slug);
      return next;
    });
  }

  const totalSelected = checkedSlugs.size;
  const verifiedDuplicateCount = groups.filter((g) => g.verified?.verdict === "duplicate").length;
  const verifiedDistinctCount = groups.filter((g) => g.verified?.verdict === "distinct").length;
  const unverifiedCount = groups.length - verifiedDuplicateCount - verifiedDistinctCount;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="text-[11px] text-brand-muted bg-brand-cream border border-brand-border rounded-md px-3 py-2">
        Zweryfikowano na gsmarena.com: <strong>{verifiedDuplicateCount}</strong> grup to duplikaty (zaznaczone do
        wycofania), <strong>{verifiedDistinctCount}</strong> grup to naprawdę różne telefony (nic nie zaznaczono).{" "}
        {unverifiedCount > 0 && (
          <>
            <strong>{unverifiedCount}</strong> nowych grup bez weryfikacji — użyto heurystyki kompletności danych.
          </>
        )}
      </div>

      {state?.status === "error" && <p className="text-xs text-red-700">{state.message}</p>}
      {state?.status === "done" && <p className="text-xs text-brand-ink bg-green-50 border border-green-200 rounded-md px-3 py-2">{state.message}</p>}

      {groups.map((g, i) => (
        <div key={i} className="border border-brand-border rounded-lg bg-white">
          <div className="flex items-center justify-between px-3 pt-2 gap-3">
            <span className="text-[11px] text-brand-muted shrink-0">
              Grupa {i + 1} / {groups.length}
            </span>
            {g.verified?.verdict === "duplicate" && (
              <span className="text-[11px] text-green-700">✓ zweryfikowano (gsmarena.com): to ten sam telefon</span>
            )}
            {g.verified?.verdict === "distinct" && (
              <span className="text-[11px] text-blue-700">✓ zweryfikowano (gsmarena.com): to różne telefony</span>
            )}
            {!g.verified && (
              <button
                type="button"
                onClick={() => skipGroup(g)}
                className="text-[11px] text-brand-secondary hover:text-brand-ink underline shrink-0"
              >
                Pomiń tę grupę (to różne produkty)
              </button>
            )}
          </div>
          {g.verified && (
            <p className="text-[11px] text-brand-muted px-3 pt-1">{g.verified.reason}</p>
          )}
          <div className="p-1">
            {g.candidates.map((c) => (
              <Candidate
                key={c.slug}
                c={c}
                checked={checkedSlugs.has(c.slug)}
                onToggle={() => toggle(c.slug)}
                isRecommendedKeep={c.slug === g.recommendedKeepSlug}
              />
            ))}
          </div>
        </div>
      ))}

      {[...checkedSlugs].map((slug) => (
        <input key={slug} type="hidden" name="unpublish_slug" value={slug} />
      ))}

      <div className="sticky bottom-0 bg-brand-bg/95 backdrop-blur border-t border-brand-border pt-3 pb-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || totalSelected === 0}
          className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream disabled:opacity-50"
        >
          {pending ? "Wycofywanie..." : `Wycofaj zaznaczone (${totalSelected})`}
        </button>
        <span className="text-[11px] text-brand-muted">
          Wycofanie ustawia status na "draft" (widoczne w /admin, do przywrócenia jednym kliknięciem) — nie kasuje
          danych.
        </span>
      </div>
    </form>
  );
}
