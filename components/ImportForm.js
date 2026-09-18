"use client";

import { useState, useActionState } from "react";
import { buildImportPrompt } from "../lib/importPrompt.js";
import { importProducts } from "../app/admin/import/actions.js";

const RESULT_STYLES = {
  published: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  skipped: "bg-brand-cream text-brand-muted",
  error: "bg-red-100 text-red-800",
};

const RESULT_LABELS = {
  published: "opublikowano",
  draft: "draft",
  skipped: "pominięto",
  error: "błąd",
};

export default function ImportForm({ categories }) {
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [scope, setScope] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [payload, setPayload] = useState("");
  const [fileError, setFileError] = useState("");
  const [state, formAction, pending] = useActionState(importProducts, null);

  function handleGeneratePrompt() {
    if (!category || !scope.trim()) return;
    setPrompt(buildImportPrompt(category, scope.trim()));
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      // Clipboard API can be unavailable (e.g. non-HTTPS); the textarea below
      // is still selectable/copyable by hand in that case.
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same filename later
    if (!file) return;

    setFileError("");
    const reader = new FileReader();
    reader.onload = () => setPayload(String(reader.result ?? ""));
    reader.onerror = () => setFileError("Nie udało się odczytać pliku");
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-brand-border rounded-lg p-4 bg-white">
        <p className="text-sm font-medium text-brand-ink mb-3">Krok 1 — wygeneruj prompt</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder={`Zakres, np. "wszystkie obecnie sprzedawane telewizory Samsung" albo "wszystkie iPhone'y"`}
            className="border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white flex-1 min-w-[280px]"
          />
          <button
            type="button"
            onClick={handleGeneratePrompt}
            disabled={!category || !scope.trim()}
            className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream shrink-0 disabled:opacity-50"
          >
            Generuj prompt
          </button>
        </div>
        <p className="text-xs text-brand-muted mb-3">
          To ma zwrócić wiele modeli naraz jako tablicę JSON — nie jeden produkt na raz. Zakres może być dowolnie
          szeroki lub wąski: marka, cała kategoria, konkretna seria itd.
        </p>

        {prompt && (
          <div>
            <textarea
              readOnly
              value={prompt}
              rows={14}
              className="w-full border border-brand-border rounded-md px-3 py-2 text-xs font-mono bg-brand-cream/40"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-md border border-brand-border hover:bg-brand-cream"
              >
                {copied ? "Skopiowano ✓" : "Kopiuj do schowka"}
              </button>
              <p className="text-xs text-brand-muted">
                Wklej ten prompt w zwykłym czacie Gemini, dopytaj/popraw jeśli trzeba, i skopiuj zwróconą tablicę
                JSON poniżej.
              </p>
            </div>
          </div>
        )}
      </div>

      <form action={formAction} className="border border-brand-border rounded-lg p-4 bg-white flex flex-col gap-3">
        <p className="text-sm font-medium text-brand-ink">Krok 2 — wklej odpowiedź i zapisz</p>
        <input type="hidden" name="category" value={category} />
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
          rows={28}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="Wklej tu tablicę JSON zwróconą przez Gemini (albo wgraj plik powyżej)"
          className="w-full border border-brand-border rounded-md px-3 py-2 text-xs font-mono resize-y min-h-[300px]"
        />
        {state?.status === "error" && <p className="text-xs text-red-700">{state.message}</p>}
        {state?.status === "done" && <p className="text-xs text-brand-ink">{state.message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream self-start disabled:opacity-50"
        >
          {pending ? "Zapisywanie..." : "Waliduj i zapisz"}
        </button>

        {state?.results?.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {state.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full shrink-0 ${RESULT_STYLES[r.status]}`}>
                  {RESULT_LABELS[r.status]}
                </span>
                <div>
                  <span className="text-brand-ink font-medium">{r.name}</span>{" "}
                  <span className="text-brand-muted">— {r.note}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
