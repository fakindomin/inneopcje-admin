"use client";

import { useRef, useState } from "react";

// Drives app/api/admin/telewizory-price-backfill in a client-side loop -
// that route only does one small batch per call (Vercel function time
// limit), so getting through the whole cold-imported catalog means calling
// it repeatedly until `remaining` hits 0. A ref (not state) gates the loop
// so clicking "Zatrzymaj" takes effect on the next iteration immediately,
// without waiting on a stale closure over state.
export default function TelewizoryPriceBackfillPanel({ initialRemaining }) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [pricedTotal, setPricedTotal] = useState(0);
  const [processedTotal, setProcessedTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const runningRef = useRef(false);

  async function runLoop() {
    runningRef.current = true;
    setRunning(true);
    setError(null);

    while (runningRef.current) {
      let data;
      try {
        const res = await fetch("/api/admin/telewizory-price-backfill", { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } catch (err) {
        setError(err.message);
        break;
      }

      setProcessedTotal((n) => n + data.processed);
      setPricedTotal((n) => n + data.priced);
      setRemaining(data.remaining);

      if (data.processed === 0 || data.remaining === 0) break;
    }

    runningRef.current = false;
    setRunning(false);
  }

  function stop() {
    runningRef.current = false;
  }

  return (
    <div className="border border-brand-border rounded-lg p-4 bg-white flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-ink">
          Pozostało bez ceny: <span className="text-brand-orange">{remaining}</span>
        </p>
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
          >
            Zatrzymaj
          </button>
        ) : (
          <button
            type="button"
            onClick={runLoop}
            disabled={remaining === 0}
            className="text-xs px-3 py-1.5 rounded-md border border-brand-ink hover:bg-brand-cream disabled:opacity-50"
          >
            {remaining === 0 ? "Gotowe" : "Start"}
          </button>
        )}
      </div>

      {processedTotal > 0 && (
        <p className="text-xs text-brand-muted">
          W tej sesji: sprawdzono {processedTotal}, znaleziono cenę dla {pricedTotal}.
        </p>
      )}

      {error && <p className="text-xs text-red-700">Błąd: {error}. Kliknij "Start" żeby spróbować dalej.</p>}
    </div>
  );
}
