import { GoogleGenAI } from "@google/genai";

// Same model/tier as the discovery bot (inneopcje.pl repo) for consistency,
// but this call is triggered by a page view, not a cron - see
// app/api/phone/[slug]/price/route.js for the staleness gate that keeps
// this rare in practice.
const MODEL = "gemini-3.5-flash-lite";

let client;
function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function buildPricePrompt(name) {
  return `Sprawdź w internecie aktualną cenę modelu "${name}" w normalnej sprzedaży detalicznej w Polsce, w PLN.

Zwróć WYŁĄCZNIE liczbę lub zakres cen w PLN (np. "1999" albo "1999-2199"), bez waluty, bez żadnego innego tekstu ani komentarza. Jeśli nie znajdziesz wiarygodnej, aktualnej ceny, zwróć dokładnie: BRAK`;
}

const PRICE_PATTERN = /^\d[\d,.\s-]*\d$|^\d+$/;

// Forced JSON output and Google Search grounding don't reliably combine in
// one call (same constraint the discovery bot hit - see inneopcje.pl's
// lib/gemini.js) - this asks for a bare price string instead of JSON, same
// workaround as that repo's generateSeedNames.
//
// Returns the new price string, or null if Gemini found nothing reliable
// (caller leaves the existing price untouched rather than overwriting it
// with a guess).
export async function fetchLivePrice(name) {
  const ai = getClient();
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
