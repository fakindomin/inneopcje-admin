"use client";

import { useState, useActionState } from "react";
import { buildImportPrompt } from "../lib/importPrompt.js";
import { importProduct } from "../app/admin/import/actions.js";

export default function ImportForm({ categories }) {
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(importProduct, null);

  function handleGeneratePrompt() {
    if (!category || !name.trim()) return;
    setPrompt(buildImportPrompt(category, name.trim()));
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Nazwa produktu, np. "Samsung Galaxy S25"'
            className="border border-brand-border rounded-md px-3 py-1.5 text-sm bg-white flex-1 min-w-[220px]"
          />
          <button
            type="button"
            onClick={handleGeneratePrompt}
            disabled={!category || !name.trim()}
            className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream shrink-0 disabled:opacity-50"
          >
            Generuj prompt
          </button>
        </div>

        {prompt && (
          <div>
            <textarea
              readOnly
              value={prompt}
              rows={12}
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
                Wklej ten prompt w zwykłym czacie Gemini, poproś o wyszukanie/weryfikację jeśli czegoś nie jest
                pewien, i skopiuj zwrócony JSON poniżej.
              </p>
            </div>
          </div>
        )}
      </div>

      <form action={formAction} className="border border-brand-border rounded-lg p-4 bg-white flex flex-col gap-3">
        <p className="text-sm font-medium text-brand-ink">Krok 2 — wklej odpowiedź i zapisz</p>
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="name" value={name} />
        <textarea
          name="payload"
          rows={10}
          placeholder="Wklej tu JSON zwrócony przez Gemini"
          className="w-full border border-brand-border rounded-md px-3 py-2 text-xs font-mono"
        />
        {state?.status === "error" && <p className="text-xs text-red-700">{state.message}</p>}
        {state?.status === "success" && <p className="text-xs text-green-700">{state.message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream self-start disabled:opacity-50"
        >
          {pending ? "Zapisywanie..." : "Waliduj i zapisz"}
        </button>
      </form>
    </div>
  );
}
