import { GoogleGenAI } from "@google/genai";

// Same model/tier as the discovery bot (inneopcje.pl repo) for consistency,
// but this call is triggered by a page view, not a cron - see
// app/api/phone/[slug]/price/route.js for the staleness gate that keeps
// this rare in practice.
const MODEL = "gemini-3.5-flash-lite";

// Cached per API key, not just once - callers can pass a different key
// (e.g. telewizory's own GEMINI_API_KEY_TV, kept separate so a bulk price
// backfill doesn't eat into the quota the phones' page-view refresh uses).
const clients = new Map();
function getClient(apiKey) {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  if (!clients.has(key)) clients.set(key, new GoogleGenAI({ apiKey: key }));
  return clients.get(key);
}

function buildPricePrompt(name) {
  return `Sprawdź w internecie aktualną cenę modelu "${name}" w normalnej sprzedaży detalicznej w Polsce, w PLN.

Uwaga: producenci często mają wiele podobnie nazwanych wariantów tego samego modelu (inna końcowa litera/cyfra, wersje 4G/5G, Pro/Plus/Lite) - zanim podasz cenę, upewnij się, że dotyczy DOKŁADNIE modelu "${name}", a nie innego, podobnie nazwanego wariantu z tej samej rodziny.

Zwróć WYŁĄCZNIE liczbę lub zakres cen w PLN (np. "1999" albo "1999-2199"), bez waluty, bez żadnego innego tekstu ani komentarza. Jeśli nie znajdziesz wiarygodnej, aktualnej ceny DOKŁADNIE tego modelu, zwróć dokładnie: BRAK`;
}

const PRICE_PATTERN = /^\d[\d,.\s-]*\d$|^\d+$/;

// Forced JSON output and Google Search grounding don't reliably combine in
// one call (same constraint the discovery bot hit - see inneopcje.pl's
// lib/gemini.js) - this asks for a bare price string instead of JSON, same
// workaround as that repo's generateSeedNames.
//
// Returns the new price string, or null if Gemini found nothing reliable
// (caller leaves the existing price untouched rather than overwriting it
// with a guess). `apiKey` overrides GEMINI_API_KEY for callers that need a
// separate quota (see getClient() above).
export async function fetchLivePrice(name, { apiKey } = {}) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPricePrompt(name),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = (response.text ?? "").trim();
  if (!text || /^BRAK$/i.test(text) || !PRICE_PATTERN.test(text)) return null;
  return text;
}
