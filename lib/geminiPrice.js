import { GoogleGenAI } from "@google/genai";

// gemini-3.5-flash-lite (the original pick, matching the discovery bot in
// inneopcje.pl) started returning 429/503 account-wide - confirmed via
// /api/admin/debug-price-check's ?probe= (6 unrelated keys, identical
// failure) that it's the model overloaded on Google's side, not any one
// key. 3.6-flash is Google's own suggested replacement in that error and
// is the one combination that's actually worked in testing.
const MODEL = "gemini-3.6-flash";

// Search grounding (tools:[{googleSearch:{}}]) is capped at 0/0 for the
// WHOLE Gemini 3.x family on the free tier right now (AI Studio's Rate
// Limits > Tools > "Search grounding" row), while every Gemini 2.x/2.5.x
// model 404s as "no longer available to new users" - so there is
// currently no available model+grounding combination at all, on any key.
// Off until Google's allocation changes or billing is added; flip this
// one flag back on then; every call site already reads it via
// generatePriceText's default param.
const GROUNDING_ENABLED = false;

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

Producenci często mają wiele podobnie nazwanych wariantów tego samego modelu (inna końcowa litera/cyfra, wersje 4G/5G, Pro/Plus/Lite, inny rocznik) - trzymaj się tych zasad:

1. Jeśli znajdziesz wiarygodną, aktualną cenę DOKŁADNIE modelu "${name}", zwróć samą liczbę lub zakres w PLN (np. "1999" albo "1999-2199"), bez waluty i bez żadnego innego tekstu.
2. Jeśli nie znajdziesz ceny dokładnie tego modelu, ale w sprzedaży jest bardzo zbliżony wariant tej samej serii (ten sam rozmiar/segment, różniący się tylko drobnym oznaczeniem czy rocznikiem), podaj jego cenę z dopiskiem "ok. " na początku, np. "ok. 5999" albo "ok. 5999-6499" - tak żeby było jasne, że to szacunek dla zbliżonego modelu, a nie dokładna cena.
3. Jeśli nie znajdziesz nawet zbliżonego odpowiednika, zwróć dokładnie: BRAK

Nie zwracaj nic poza liczbą/zakresem (ewentualnie z dopiskiem "ok. ") albo słowem BRAK.`;
}

const APPROX_PREFIX = /^ok\.?\s*/i;
const PRICE_PATTERN = /^\d[\d,.\s-]*\d$|^\d+$/;

// Both GEMINI_API_KEY and GEMINI_API_KEY_TV are on their own (free-tier)
// quota, which a bulk backfill can exhaust for the rest of the day - these
// are the shared fallbacks for either, tried in order once a 429 confirms
// the current key's quota is actually the problem (not some other failure
// worth surfacing as-is to the caller). Plain env vars rather than a single
// comma-joined one so each key stays a distinct, individually-rotatable
// Vercel secret.
function isQuotaExhausted(err) {
  return /RESOURCE_EXHAUSTED|"code":\s*429/.test(err?.message ?? "");
}

export function fallbackApiKeys() {
  return [
    process.env.GEMINI_API_KEY_FALLBACK,
    process.env.GEMINI_API_KEY_FALLBACK_2,
    process.env.GEMINI_API_KEY_FALLBACK_3,
    process.env.GEMINI_API_KEY_FALLBACK_4,
    process.env.GEMINI_API_KEY_FALLBACK_5,
  ].filter(Boolean);
}

export const DEFAULT_MODEL = MODEL;

// Also exported for app/api/admin/debug-price-check's ?probe=1/?model=/
// ?groundingTest=1 modes - lets that route test keys, models and grounding
// independently of fetchLivePrice's own defaults, which is how the
// GROUNDING_ENABLED=false decision above was reached.
export async function generatePriceText(name, apiKey, model = MODEL, grounding = GROUNDING_ENABLED) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model,
    contents: buildPricePrompt(name),
    config: {
      tools: grounding ? [{ googleSearch: {} }] : undefined,
      temperature: 0.2,
    },
  });
  return (response.text ?? "").trim();
}

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
  const attempts = [apiKey, ...fallbackApiKeys()];
  let text;
  for (let i = 0; i < attempts.length; i++) {
    try {
      text = await generatePriceText(name, attempts[i]);
      break;
    } catch (err) {
      const hasMoreKeys = i < attempts.length - 1;
      if (!isQuotaExhausted(err) || !hasMoreKeys) throw err;
      // else: this key's quota is exhausted and there's another one queued
      // up - loop continues to try it.
    }
  }

  if (!text || /^BRAK$/i.test(text)) return null;

  // Without grounding this is Gemini's trained knowledge, never a live
  // search result, however confidently it answers - always marked
  // approximate regardless of what the model itself said, not just when it
  // volunteers the "ok." prefix itself (see GROUNDING_ENABLED above).
  const isApprox = APPROX_PREFIX.test(text) || !GROUNDING_ENABLED;
  const numericPart = text.replace(APPROX_PREFIX, "").trim();
  if (!PRICE_PATTERN.test(numericPart)) return null;
  return isApprox ? `ok. ${numericPart}` : numericPart;
}
