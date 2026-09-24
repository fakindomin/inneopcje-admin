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

// Exported for app/api/admin/debug-price-check's ?probe=1 mode only - lets
// that route test the primary and fallback keys independently instead of
// through fetchLivePrice's shared retry, to tell "these keys share one
// exhausted quota" apart from "the retry itself has a bug". The optional
// `model` override is for the same route's ?model=. `grounding` (default
// true) is for the same route's ?grounding=0 - Search grounding is
// frequently its own, much stricter free-tier quota separate from the
// base model's RPD/RPM (sometimes 0 on free tier regardless of the
// model's own quota), so a 429 that happens on every key/account/model but
// disappears with grounding off would point at the googleSearch tool
// itself, not any of those.
export async function generatePriceText(name, apiKey, model = MODEL, grounding = true) {
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

  const isApprox = APPROX_PREFIX.test(text);
  const numericPart = text.replace(APPROX_PREFIX, "").trim();
  if (!PRICE_PATTERN.test(numericPart)) return null;
  return isApprox ? `ok. ${numericPart}` : numericPart;
}
