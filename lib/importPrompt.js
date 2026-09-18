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

// Rolling 5-year window (current year and the four before it) — computed at
// call time so this doesn't need a code change every January. Widened from
// 3 years because a shorter window cut off brands (e.g. iPhone) that keep
// older models in official retail longer than others, making their scope
// look artificially smaller than e.g. Samsung's.
export function minAllowedReleaseYear() {
  return new Date().getFullYear() - 4;
}

// Builds the text to paste into a normal Gemini chat (gemini.google.com or
// AI Studio's chat mode) — not an API call. `scope` is a free-text
// description of the whole batch ("wszystkie obecnie sprzedawane telewizory
// Samsung", "wszystkie iPhone'y"), not a single model — this asks for every
// matching model in one JSON array instead of one round-trip per product,
// since doing this one item at a time isn't a realistic workflow. The point
// of the manual flow is that a human is present to ask Gemini to
// double-check itself, so this explicitly asks it to search rather than
// recall from memory, and to skip rather than invent anything it's unsure of.
export function buildImportPrompt(category, scope) {
  const specHint = CATEGORY_SPEC_HINTS[category] ?? "";
  const brands = ALLOWED_BRANDS[category];
  const brandHint = brands
    ? `\nPole "brand" MUSI być jedną z dokładnie tych wartości (dopasuj pisownię 1:1): ${brands.join(", ")}. Pomiń modele marek spoza tej listy.\n`
    : "";
  const minYear = minAllowedReleaseYear();

  return `Wyszukaj w internecie i wypisz WSZYSTKIE modele pasujące do zakresu: "${scope}" (kategoria: ${category}), które są obecnie w normalnej sprzedaży detalicznej w Polsce. Nie ograniczaj się do kilku przykładów — chodzi o pełną, wyczerpującą listę pasujących modeli. Nie zmyślaj modeli, które nie istnieją — jeśli nie masz pewności co do jakiegoś konkretnego modelu, pomiń go zamiast zgadywać.

Dla KAŻDEGO znalezionego modelu zweryfikuj realne, aktualne dane (cenę, specyfikację, rok premiery) zamiast polegać wyłącznie na pamięci, i oceń go pod kątem stosunku ceny do jakości z perspektywy polskiego rynku i cen w PLN.

Zwróć WYŁĄCZNIE poprawną tablicę JSON (bez markdown, bez komentarzy) — jeden element na model, dokładnie w takim kształcie:
[
  {
    "name": string (pełna, jednoznaczna nazwa modelu: marka + model, bez duplikatów w tej liście),
    "verdict": string (krótkie, jednozdaniowe podsumowanie werdyktu),
    "score": number (1-10, jedno miejsce po przecinku),
    "summary": string (2-3 zdania uzasadnienia),
    "pros": string[] (2-4 pozycje),
    "cons": string[] (2-4 pozycje),
    "specs": object (klucz-wartość ze specyfikacją techniczną, ZAWSZE zawiera "price_pln_approx" jako string zawierający WYŁĄCZNIE liczbę albo zakres liczba-liczba w PLN, bez symbolu waluty i bez słów — np. "2500" albo "2500-2800", NIGDY "ok. 2500 zł" ani podobnie),
    "brand": string (nazwa producenta),
    "brand_recognition": "mainstream" | "niche" (czy marka jest szeroko rozpoznawalna w Polsce),
    "price_tier": "budzetowy" | "sredni" | "premium",
    "release_year": number (rok premiery/wprowadzenia tego konkretnego modelu na rynek — zweryfikuj wyszukiwarką, nie zgaduj z pamięci),
    "confidence": "wysoka" | "niska"
  }
]
${brandHint}
${specHint}

Interesują nas WYŁĄCZNIE modele wprowadzone na rynek od ${minYear} roku wzwyż. Jeśli w ramach podanego zakresu trafi się model starszy niż ${minYear} rok, pomiń go całkowicie (nie umieszczaj go w tablicy).

Jeśli o którymś modelu nie masz wystarczająco pewnych danych, żeby podać rzetelne dane (ryzyko pomyłki modelu, konfuzji z innym produktem), ustaw dla niego "confidence": "niska" zamiast zgadywać szczegóły — ale i tak go umieść w tablicy, jeśli produkt na pewno istnieje.`;
}
