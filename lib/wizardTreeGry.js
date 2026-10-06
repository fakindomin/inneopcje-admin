// Pytania ankiety "dobierz grę dla siebie" - ta sama architektura co
// lib/wizardTreeTv.js (step()/resolvePath() z samowalidującymi
// odpowiedziami), ale z semantyką dopasowaną do gier zamiast telewizorów:
// platforma zajmuje miejsce "producenta" jako twardy filtr (to realny,
// nieredukowalny wybór - czego fizycznie można użyć do grania), a tryb gry
// to osobny twardy filtr (nie tag priorytetowy), bo ktoś szukający czysto
// solowej gry nie chce dostać tytułu bez trybu dla jednego gracza w ogóle.

const BUDZET_OPTIONS = [
  { id: "budzetowy", label: "Szukam rozsądnego minimum" },
  { id: "sredni", label: "Zależy mi na wysokiej opłacalności" },
  { id: "premium", label: "Inwestuję w bezkompromisowe wrażenia" },
];

// Trzy wymiary, które specs faktycznie wspierają (zob. data/gry.json:
// fabula_score/rozgrywka_score/spoleczny_score) - tak samo jak telewizory
// mają obraz/gaming/dzwiek zamiast telefonów 4 wymiarów.
const PRIORYTET_OPTIONS = [
  { id: "fabula", label: "Wciągająca historia i klimat – chcę przeżyć coś więcej niż tylko rozgrywkę.", tag: "fabula" },
  { id: "rozgrywka", label: "Satysfakcjonująca mechanika – wyzwanie, zręczność, dopracowany gameplay.", tag: "rozgrywka" },
  { id: "spoleczny", label: "Wspólna zabawa – granie ze znajomymi albo w większej społeczności.", tag: "spoleczny" },
];

const PRIORYTET2_LABELS = {
  fabula: "Fabuła w tle, gdyby się trafiła dobra.",
  rozgrywka: "Przyjemna mechanika w tle, nawet jeśli to nie najważniejsze.",
  spoleczny: "Miło, jeśli czasem da się zagrać z kimś.",
};

const PLATFORMA_OPTIONS = [
  { id: "PC", label: "PC" },
  { id: "PlayStation", label: "PlayStation" },
  { id: "Xbox", label: "Xbox" },
  { id: "Switch", label: "Nintendo Switch" },
  { id: "Mobilne", label: "Telefon / tablet" },
];

const TRYB_OPTIONS = [
  { id: "solo", label: "Zdecydowanie solo – nie chcę być zależny/a od innych graczy." },
  { id: "multiplayer", label: "Głównie ze znajomymi albo online." },
  { id: "oba", label: "Wszystko jedno – i jedno, i drugie mi pasuje." },
];

const SESJA_OPTIONS = [
  { id: "krotkie", label: "Mam tylko chwilę – szukam czegoś na krótkie sesje." },
  { id: "zloty_srodek", label: "Złoty środek – kilkadziesiąt minut, kiedy akurat mam czas." },
  { id: "dlugie", label: "Mogę się zasiedzieć – szukam czegoś wciągającego na długo." },
];

function step(id, question, options, storedAnswer) {
  const answer = options.some((o) => o.id === storedAnswer) ? storedAnswer : null;
  return { id, question, options, answer };
}

export function resolvePath(answers) {
  const steps = [];
  const tagPicks = [];

  function addTagPick(tag) {
    if (["fabula", "rozgrywka", "spoleczny"].includes(tag) && !tagPicks.includes(tag)) {
      tagPicks.push(tag);
    }
  }

  function push(id, question, options) {
    const s = step(id, question, options, answers[id] ?? null);
    steps.push(s);
    return s.answer;
  }

  const budzet = push("budzet", "Jak zazwyczaj podejmujesz decyzje przy zakupie gry?", BUDZET_OPTIONS);
  if (!budzet) return steps;

  const priorytet1 = push("priorytet1", "Co jest dla Ciebie najważniejsze w grze?", PRIORYTET_OPTIONS);
  if (!priorytet1) return steps;
  const chosen1 = PRIORYTET_OPTIONS.find((o) => o.id === priorytet1);
  addTagPick(chosen1.tag);

  const remainingTags = ["fabula", "rozgrywka", "spoleczny"].filter((tag) => tag !== chosen1.tag);
  const priorytet2Options = [
    ...remainingTags.map((tag) => ({ id: tag, label: PRIORYTET2_LABELS[tag], tag })),
    { id: "brak2", label: "Nic więcej mnie nie interesuje", tag: null },
  ];
  const priorytet2 = push("priorytet2", "A co jeszcze byłoby miłym dodatkiem?", priorytet2Options);
  if (!priorytet2) return steps;
  const chosen2 = priorytet2Options.find((o) => o.id === priorytet2);
  if (chosen2.tag) addTagPick(chosen2.tag);

  const platforma = push("platforma", "Na czym będziesz grać?", PLATFORMA_OPTIONS);
  if (!platforma) return steps;

  const tryb = push("tryb", "Wolisz grać solo czy w towarzystwie?", TRYB_OPTIONS);
  if (!tryb) return steps;

  const sesja = push("sesja", "Ile czasu zwykle masz na jedną sesję?", SESJA_OPTIONS);
  if (!sesja) return steps;

  steps.push({
    id: "wynik",
    question: null,
    options: null,
    answer: "done",
    profile: { budzet, tags: tagPicks, platforma, tryb, sesjaPreference: sesja },
  });
  return steps;
}
