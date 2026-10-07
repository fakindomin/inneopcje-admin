import { getPool } from "./db.js";

// Przebudowany od zera wg specyfikacji ustalonej z użytkownikiem (patrz
// rozmowa, nie moja wcześniejsza wersja): platforma, tryb i perspektywa są
// twardymi filtrami (fizyczne ograniczenia - gra się nie odpali / nie ma
// trybu/perspektywy, której szukasz). Pozostałe 9 odpowiedzi to miękkie preferencje,
// każda spełniona dodaje punkty do wyniku kandydata (gatunek: +1 za każdy
// trafiony z wybranych, bo to jedyne kryterium wielowartościowe po obu
// stronach; wszystkie pozostałe: płaskie +1), żadna nigdy nie wyklucza
// gry z puli. Zwycięża najwyższy wynik, remisy rozstrzyga ogólna ocena
// (price-to-quality `score`, jak w resztcie katalogu).

const WAGA_THRESHOLD = { tak: 4, troche: 3 };

function matchesHardFilters(candidate, profile) {
  const specs = candidate.specs || {};
  const platformy = Array.isArray(specs.platformy) ? specs.platformy : [];
  if (profile.platformy.length > 0 && !profile.platformy.some((p) => platformy.includes(p))) return false;

  if (profile.tryb === "solo" && !["solo", "oba"].includes(specs.tryb)) return false;
  if (profile.tryb === "multiplayer" && !["multiplayer", "oba"].includes(specs.tryb)) return false;

  // Twardy filtr, nie miękka preferencja - jak platforma/tryb powyżej (zob.
  // wizardTreeGry.js). Gry bez tego pola (jeszcze nie zbackfillowane) nie są
  // wykluczane - traktowane jak dopasowujące każdą perspektywę.
  if (profile.perspektywa.length > 0 && specs.perspektywa && !profile.perspektywa.includes(specs.perspektywa)) {
    return false;
  }

  return true;
}

// +1 za każde spełnione miękkie kryterium. Odpowiedź neutralna ("nie ma
// znaczenia" / "dowolny" / "dowolne") nigdy nie liczy się ani za, ani
// przeciw - po prostu nie bierze udziału w tej rundzie punktacji.
function softScore(candidate, profile) {
  const specs = candidate.specs || {};
  let points = 0;

  // Gatunek liczy się proporcjonalnie do liczby trafień, nie binarnie -
  // inaczej gra trafiająca w 1 z 2 wybranych gatunków punktuje tyle samo,
  // co gra trafiająca w oba, co w praktyce potrafiło dać remis jRPG
  // (oznaczonego gatunkiem głównie jako RPG/Strategia, ale z jednym
  // pobocznym tagiem "Przygodowa") z grą faktycznie pasującą do obu
  // wybranych gatunków - remis rozstrzygało wtedy ogólne `score`
  // (stosunek ceny do jakości), zupełnie niezwiązane z trafnością
  // gatunku, i wygrywał gorszy dopasowaniem tytuł.
  const gatunki = Array.isArray(specs.gatunki) ? specs.gatunki : [];
  points += gatunki.filter((g) => profile.gatunki.includes(g)).length;

  if (profile.produkcja.includes(specs.produkcja)) points++;

  if (profile.dlugosc.includes(specs.dlugosc)) points++;

  if (profile.fabula !== "nie") {
    const threshold = WAGA_THRESHOLD[profile.fabula];
    if ((Number(specs.fabula_score) || 0) >= threshold) points++;
  }

  if (profile.grafika !== "nie") {
    const threshold = WAGA_THRESHOLD[profile.grafika];
    if ((Number(specs.grafika_score) || 0) >= threshold) points++;
  }

  if (profile.rok === "najnowsze") {
    if (isWithinLast12Months(candidate.release_year, specs.release_month)) points++;
  }

  if (Boolean(specs.wybor_trudnosci) === (profile.trudnosc === "wybor")) points++;

  if (profile.klimat !== "dowolny" && specs.klimat === profile.klimat) points++;

  if (profile.openWorld !== "dowolne" && specs.open_world === profile.openWorld) points++;

  return points;
}

function isWithinLast12Months(releaseYear, releaseMonth) {
  const year = Number(releaseYear);
  const month = Number(releaseMonth);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return false;
  const releaseDate = new Date(Date.UTC(year, month - 1, 1));
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate()));
  return releaseDate >= cutoff && releaseDate <= now;
}

export function pickBest(candidates, profile) {
  const pool = candidates.filter((c) => matchesHardFilters(c, profile));
  if (pool.length === 0) return null;

  function compare(a, b) {
    const diff = softScore(b, profile) - softScore(a, profile);
    if (diff !== 0) return diff;
    return (Number(b.score) || 0) - (Number(a.score) || 0);
  }

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (compare(pool[i], best) < 0) best = pool[i];
  }
  return best;
}

export async function matchGre(profile) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.slug, p.brand, p.brand_recognition, p.verdict, p.score,
            p.summary, p.pros, p.cons, p.specs, p.price_tier, p.release_year
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'gry' AND p.status = 'published'`
  );

  return pickBest(result.rows, profile);
}
