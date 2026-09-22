"use client";

import { useState, useActionState } from "react";
import { patchSpecs } from "../app/admin/specs-patch/actions.js";

const RESULT_STYLES = {
  updated: "bg-green-100 text-green-800",
  not_found: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
};

const RESULT_LABELS = {
  updated: "zaktualizowano",
  not_found: "nie znaleziono",
  error: "błąd",
};

export default function SpecsPatchForm() {
  const [payload, setPayload] = useState("");
  const [fileError, setFileError] = useState("");
  const [state, formAction, pending] = useActionState(patchSpecs, null);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileError("");
    const reader = new FileReader();
    reader.onload = () => setPayload(String(reader.result ?? ""));
    reader.onerror = () => setFileError("Nie udało się odczytać pliku");
    reader.readAsText(file);
  }

  return (
    <form action={formAction} className="border border-brand-border rounded-lg p-4 bg-white flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleFileUpload}
          className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-brand-border file:bg-white file:text-xs hover:file:bg-brand-cream file:cursor-pointer"
        />
        <p className="text-xs text-brand-muted">albo wklej JSON ręcznie poniżej</p>
      </div>
      {fileError && <p className="text-xs text-red-700">{fileError}</p>}
      <textarea
        name="payload"
        rows={22}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        placeholder='{"iphone-17": {"front_camera_mp": 12, "charging_w": 27, "screen_panel_type": "AMOLED", "weight_g": 177, "foldable": false}, ...}'
        className="w-full border border-brand-border rounded-md px-3 py-2 text-xs font-mono resize-y min-h-[280px]"
      />
      {state?.status === "error" && <p className="text-xs text-red-700">{state.message}</p>}
      {state?.status === "done" && <p className="text-xs text-brand-ink">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream self-start disabled:opacity-50"
      >
        {pending ? "Zapisywanie..." : "Nałóż łatkę"}
      </button>

      {state?.results?.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2 max-h-[400px] overflow-y-auto">
          {state.results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full shrink-0 ${RESULT_STYLES[r.status]}`}>
                {RESULT_LABELS[r.status]}
              </span>
              <div>
                <span className="text-brand-ink font-medium">{r.slug}</span>{" "}
                <span className="text-brand-muted">— {r.note}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
