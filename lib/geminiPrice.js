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
// quota, which a bulk backfill can exhaust for the rest of the day - this
// is the one shared fallback for either, tried once a 429 confirms the
// primary key's quota is actually the problem (not some other failure
// worth surfacing as-is to the caller).
function isQuotaExhausted(err) {
  return /RESOURCE_EXHAUSTED|"code":\s*429/.test(err?.message ?? "");
}

// Exported for app/api/admin/debug-price-check's ?probe=1 mode only - lets
// that route test the primary and fallback keys independently instead of
// through fetchLivePrice's shared retry, to tell "both keys share one
// exhausted quota" apart from "the retry itself has a bug".
export async function generatePriceText(name, apiKey) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPricePrompt(name),
    config: {
      tools: [{ googleSearch: {} }],
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
  let text;
  try {
    text = await generatePriceText(name, apiKey);
  } catch (err) {
    if (!isQuotaExhausted(err) || !process.env.GEMINI_API_KEY_FALLBACK) throw err;
    text = await generatePriceText(name, process.env.GEMINI_API_KEY_FALLBACK);
  }

  if (!text || /^BRAK$/i.test(text)) return null;

  const isApprox = APPROX_PREFIX.test(text);
  const numericPart = text.replace(APPROX_PREFIX, "").trim();
  if (!PRICE_PATTERN.test(numericPart)) return null;
  return isApprox ? `ok. ${numericPart}` : numericPart;
}
