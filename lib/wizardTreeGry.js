// Pytania ankiety "dobierz grę dla siebie" - przeprojektowane od zera wg
// specyfikacji ustalonej z użytkownikiem (nie moja wcześniejsza wersja).
// Architektura step()/resolvePath() wciąż mirroruje lib/wizardTreeTv.js,
// ale teraz z trzema twardymi filtrami (platforma, tryb, perspektywa) i
// dziewięcioma miękkimi preferencjami, które tylko punktują pulę w
// lib/wizardMatchGry.js zamiast ją obcinać - patrz tam po wyjaśnienie silnika.
// perspektywa jest twardym filtrem (jak platforma/tryb), nie miękką
// preferencją: różnica FPP/TPP/izometryczna/platformówka 2D zmienia sam
// sposób grania na tyle mocno, że sugerowanie "podobnej" gry w zupełnie innej
// perspektywie byłoby nieuczciwe, tak samo jak przy gatunku (zob.
// lib/matching.js's sharesGenre/sharesPerspective).

const PLATFORMA_OPTIONS = [
  { id: "PC", label: "PC" },
  { id: "Xbox", label: "Xbox" },
  { id: "PlayStation", label: "PlayStation" },
  { id: "Nintendo", label: "Nintendo" },
  { id: "Mobilne", label: "Mobilne" },
];

const TRYB_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "multiplayer", label: "Multiplayer" },
  { id: "oba", label: "Oba" },
];

const PERSPEKTYWA_OPTIONS = [
  { id: "FPP", label: "Pierwsza osoba (FPP)" },
  { id: "TPP", label: "Trzecia osoba (TPP)" },
  { id: "izometryczna", label: "Izometryczna / rzut z góry" },
  { id: "platformowka_2d", label: "Platformówka 2D" },
  { id: "inna", label: "Inna" },
];

const GATUNEK_OPTIONS = [
  { id: "RPG", label: "RPG" },
  { id: "Akcja", label: "Akcja" },
  { id: "Strzelanka", label: "Strzelanka" },
  { id: "Strategia", label: "Strategia" },
  { id: "Sportowa", label: "Sportowa" },
  { id: "Przygodowa", label: "Przygodowa" },
  { id: "Horror", label: "Horror" },
];

const PRODUKCJA_OPTIONS = [
  { id: "AAA", label: "Wysoki budżet (AAA)" },
  { id: "AA", label: "Średni budżet (AA)" },
  { id: "indie", label: "Niski budżet / produkcja niezależna (indie)" },
];

const DLUGOSC_OPTIONS = [
  { id: "krotka", label: "Krótka (do 10h)" },
  { id: "srednia", label: "Średnia (10-30h)" },
  { id: "dluga", label: "Długa (30h+)" },
];

const WAGA_OPTIONS = [
  { id: "tak", label: "Tak, bardzo ważna" },
  { id: "troche", label: "Trochę" },
  { id: "nie", label: "Nie ma znaczenia" },
];

const ROK_OPTIONS = [
  { id: "najnowsze", label: "Najnowsze produkcje" },
  { id: "nie_wazne", label: "Nie ma znaczenia" },
];

const TRUDNOSC_OPTIONS = [
  { id: "wybor", label: "Możliwość wyboru poziomu trudności" },
  { id: "brak", label: "Brak wyboru poziomu trudności" },
];

const KLIMAT_OPTIONS = [
  { id: "mroczny", label: "Mroczny / poważny" },
  { id: "lekki", label: "Lekki / humorystyczny" },
  { id: "dowolny", label: "Dowolny" },
];

const OPEN_WORLD_OPTIONS = [
  { id: "otwarty", label: "Otwarty świat / eksploracja" },
  { id: "liniowy", label: "Liniowa / prowadzona fabuła" },
  { id: "dowolne", label: "Dowolne" },
];

function step(id, question, options, storedAnswer) {
  const answer = options.some((o) => o.id === storedAnswer) ? storedAnswer : null;
  return { id, question, options, answer };
}

function multiStep(id, question, options, storedAnswer) {
  const valid = Array.isArray(storedAnswer)
    ? storedAnswer.filter((a) => options.some((o) => o.id === a))
    : [];
  return {
    id,
    question,
    options,
    multiSelect: true,
    maxSelect: options.length,
    answer: valid.length > 0 ? valid : null,
  };
}

export function resolvePath(answers) {
  const steps = [];

  function push(id, question, options) {
    const s = step(id, question, options, answers[id] ?? null);
    steps.push(s);
    return s.answer;
  }

  function pushMulti(id, question, options) {
    const s = multiStep(id, question, options, answers[id] ?? null);
    steps.push(s);
    return s.answer;
  }

  const platformy = pushMulti("platforma", "Na jakiej platformie grasz?", PLATFORMA_OPTIONS);
  if (!platformy) return steps;

  const tryb = push("tryb", "Wolisz grać solo czy w towarzystwie?", TRYB_OPTIONS);
  if (!tryb) return steps;

  const perspektywa = pushMulti("perspektywa", "Jaką perspektywę/styl rozgrywki preferujesz?", PERSPEKTYWA_OPTIONS);
  if (!perspektywa) return steps;

  const gatunki = pushMulti("gatunek", "Jaki rodzaj gier preferujesz?", GATUNEK_OPTIONS);
  if (!gatunki) return steps;

  const produkcja = pushMulti("produkcja", "Jaka jakość produkcji Cię interesuje?", PRODUKCJA_OPTIONS);
  if (!produkcja) return steps;

  const dlugosc = pushMulti("dlugosc", "Jaka długość rozgrywki (do ukończenia gry)?", DLUGOSC_OPTIONS);
  if (!dlugosc) return steps;

  const fabula = push("fabula", "Czy fabuła ma dla Ciebie znaczenie?", WAGA_OPTIONS);
  if (!fabula) return steps;

  const grafika = push("grafika", "Czy jakość grafiki/oprawy wizualnej ma znaczenie?", WAGA_OPTIONS);
  if (!grafika) return steps;

  const rok = push("rok", "Czy zależy Ci na najnowszych produkcjach?", ROK_OPTIONS);
  if (!rok) return steps;

  const trudnosc = push("trudnosc", "Czy ważny jest dla Ciebie wybór poziomu trudności?", TRUDNOSC_OPTIONS);
  if (!trudnosc) return steps;

  const klimat = push("klimat", "Jaki klimat gry preferujesz?", KLIMAT_OPTIONS);
  if (!klimat) return steps;

  const openWorld = push("open_world", "Otwarty świat czy liniowa fabuła?", OPEN_WORLD_OPTIONS);
  if (!openWorld) return steps;

  steps.push({
    id: "wynik",
    question: null,
    options: null,
    answer: "done",
    profile: {
      platformy,
      tryb,
      perspektywa,
      gatunki,
      produkcja,
      dlugosc,
      fabula,
      grafika,
      rok,
      trudnosc,
      klimat,
      openWorld,
    },
  });
  return steps;
}
