import { ALLOWED_BRANDS } from "./brands.js";

const CATEGORY_SPEC_HINTS = {
  telefony:
    'Dla telefonu pole "specs" powinno zawierać m.in.: screen_size_inches (number), ' +
    "chipset (string), ram_gb (number), camera_main_mp (number), battery_mah (number).",
  telewizory:
    'Dla telewizora pole "specs" powinno zawierać m.in.: screen_size_inches (number), ' +
    "panel_type (string, np. OLED/QLED/LED), resolution (string, np. 4K/8K), " +
    "refresh_rate_hz (number), hdmi_2_1_ports (number).",
};

// Rolling 3-year window (current year and the two before it) — computed at
// call time so this doesn't need a code change every January.
export function minAllowedReleaseYear() {
  return new Date().getFullYear() - 2;
}

// Builds the exact text to paste into a normal Gemini chat (gemini.google.com
// or AI Studio's chat mode) — not an API call. The point of the manual flow
// is that a human is present to ask Gemini to double-check itself, so this
// explicitly asks it to search rather than recall from memory.
export function buildImportPrompt(category, productName) {
  const specHint = CATEGORY_SPEC_HINTS[category] ?? "";
  const brands = ALLOWED_BRANDS[category];
  const brandHint = brands
    ? `\nPole "brand" MUSI być jedną z dokładnie tych wartości (dopasuj pisownię 1:1): ${brands.join(", ")}. Jeśli "${productName}" nie pochodzi od żadnej z tych marek, ustaw "confidence": "niska".\n`
    : "";
  const minYear = minAllowedReleaseYear();

  return `Wyszukaj w internecie aktualne informacje i oceń produkt "${productName}" (kategoria: ${category}) pod kątem stosunku ceny do jakości, z perspektywy polskiego rynku i cen w PLN. Zanim odpowiesz, zweryfikuj realne, aktualne dane (cenę, specyfikację, rok premiery) — jeśli nie masz pewności co do konkretnej wartości, zaznacz to niską pewnością zamiast zgadywać.

Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) o dokładnie takim kształcie:
{
  "verdict": string (krótkie, jednozdaniowe podsumowanie werdyktu),
  "score": number (1-10, jedno miejsce po przecinku),
  "summary": string (2-3 zdania uzasadnienia),
  "pros": string[] (2-4 pozycje),
  "cons": string[] (2-4 pozycje),
  "specs": object (klucz-wartość ze specyfikacją techniczną, ZAWSZE zawiera "price_pln_approx" jako string z przybliżoną ceną lub zakresem cen w PLN, np. "2500-2800"),
  "brand": string (nazwa producenta),
  "brand_recognition": "mainstream" | "niche" (czy marka jest szeroko rozpoznawalna w Polsce),
  "price_tier": "budzetowy" | "sredni" | "premium",
  "release_year": number (rok premiery/wprowadzenia tego konkretnego modelu na rynek — zweryfikuj wyszukiwarką, nie zgaduj z pamięci),
  "confidence": "wysoka" | "niska"
}
${brandHint}
${specHint}

Interesują nas WYŁĄCZNIE modele wprowadzone na rynek od ${minYear} roku wzwyż. Jeśli "${productName}" jest starszy niż ${minYear} rok, i tak podaj poprawny "release_year", ale ustaw "confidence": "niska".

Jeśli nie znasz tego produktu wystarczająco dobrze, żeby podać rzetelne dane (ryzyko pomyłki modelu, konfuzji z innym produktem, lub to nie jest realny/wydany produkt), ustaw "confidence": "niska" i NIE zgaduj szczegółów.`;
}
