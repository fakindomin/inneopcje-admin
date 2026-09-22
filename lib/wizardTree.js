// Prototype tree for the "Nie wiem czego chcę" flow — telefony only. Pure
// logic, no product data: given the answers so far, resolve() returns the
// ordered list of steps on the CURRENT active path. Each step is either
// answered (has `answer`) or is the one currently awaiting input (`answer`
// is null) — resolve() stops there and doesn't invent further steps past
// an unanswered one.
//
// Question text/options for budzet, priorytet1, priorytet2, marka, human and
// rozmiar_ekranu come from the user's own drafted wording (2026-09-22
// session). Four priorytet axes now exist: ekran/aparat/bateria/wydajnosc —
// matching the four `scores.*` fields collected in telefony_merged.json.

const BUDZET_OPTIONS = [
  {
    id: "minimum",
    label: "Szukam rozsądnego minimum – ma działać dobrze, bez przepłacania za funkcje, z których i tak nie skorzystam.",
    tier: "budzetowy",
  },
  {
    id: "oplacalnosc",
    label: "Mój cel to wysoka opłacalność – chcę świetnych możliwości w uczciwej, zrównoważonej cenie.",
    tier: "sredni",
  },
  {
    id: "bezkompromisowo",
    label: "Inwestuję w bezkompromisowe wrażenia – oczekuję technologii z najwyższej półki.",
    tier: "premium",
  },
];

// Single shared list across all budget tiers (no more per-tier option sets,
// no "brak preferencji" — forced choice among the four axes).
const PRIORYTET_OPTIONS = [
  { id: "ekran", label: "Ekran, na który patrzy się z czystą przyjemnością – ostre kolory, wysoka płynność i świetna jasność w słońcu.", tag: "ekran" },
  { id: "aparat", label: "Aparat, który po prostu robi świetne, ostre zdjęcia i wideo bez ciągłego kombinowania w ustawieniach.", tag: "aparat" },
  { id: "bateria", label: "Mocna bateria, która wyciągnie intensywny dzień bez stresu o szukanie ładowarki.", tag: "bateria" },
  { id: "wydajnosc", label: "Błyskawiczne działanie – brak jakichkolwiek przycięć przy przełączaniu się między aplikacjami.", tag: "wydajnosc" },
];

// Two rotating phrasings of the same "marka" node — the phrasing-variant
// mechanic the prototype deferred. Both reduce to the same three tags.
const MARKA_QUESTIONS = [
  "Jakie masz podejście do logo i producenta na obudowie?",
  "Którzy producenci najbardziej przekonują Cię swoimi telefonami?",
];
const MARKA_OPTIONS = [
  { id: "tak", label: "Stawiam na sprawdzone klasyki – wolę znane marki, do których mam zaufanie." },
  { id: "niszowa", label: "Pokaż mi coś mniej oczywistego – liczy się to, jak telefon działa, a nie marka na obudowie." },
  { id: "otwarta", label: "Otwarta głowa – chętnie zobaczę najlepszy sprzęt w moim budżecie, niezależnie od logo.", avoidance: true },
];

const HUMAN_OPTIONS = [
  { id: "zdjecia", label: "Wyciągam go głównie po to, by złapać fajny kadr, wrzucić coś do sieci lub sprawdzić co słychać na socialach.", tag: "aparat" },
  { id: "rozmowy", label: "Ciągle w ruchu – dużo dzwonię, piszę i jestem poza domem bez ciągłego dostępu do ładowarki.", tag: "bateria" },
  { id: "granie", label: "Dużo grania i ciężkich aplikacji – zależy mi, żeby nic się nie zacinało.", tag: "wydajnosc" },
  { id: "filmy", label: "Głównie oglądanie filmów/seriali i przewijanie treści – liczy się wygoda patrzenia na ekran.", tag: "ekran" },
  { id: "mix", label: "Klasyczny mix do wszystkiego – po trochu internetu, multimediów i sprawdzania wiadomości.", tag: null },
];

// Three concrete sizes now (was kompakt/duzy/"bez znaczenia") — maps 1:1 to
// the `size_category` field (small/medium/large) collected in the data.
const ROZMIAR_OPTIONS = [
  { id: "kompakt", label: "Kompaktowy i zgrabny – chcę łatwo obsługiwać go jedną dłonią i bez problemu schować do kieszeni.", tag: "rozmiar_ekranu" },
  { id: "sredni", label: "Złoty środek – uniwersalna wielkość do wygodnego czytania, oglądania i codziennego użytku.", tag: "rozmiar_ekranu" },
  { id: "duzy", label: "Duży ekran do multimediów – zależy mi na jak największej przestrzeni do filmów, czytania i gier.", tag: "rozmiar_ekranu" },
];

const FOLDABLE_OPTIONS = [
  { id: "skladany", label: "Tak, interesuje mnie coś nietypowego (składany)" },
  { id: "klasyczny", label: "Nie, wolę klasyczny, płaski ekran" },
];

// Forced-choice phrasing for whichever pair of priorytet axes is still
// unresolved after priorytet1/priorytet2/human. Only pairs that can
// realistically still both be open are listed; anything else falls back to
// a generic phrasing.
const FORCED_PAIR_QUESTIONS = {
  "bateria|wydajnosc": {
    question: "Co bardziej Cię wkurza: szukanie ładowarki, czy czekanie aż telefon się nie zawiesi?",
    options: [
      { id: "bateria", label: "Szukanie ładowarki" },
      { id: "wydajnosc", label: "Czekanie, aż zareaguje" },
    ],
  },
  "ekran|aparat": {
    question: "Co ważniejsze: żeby ekran cieszył oko, czy żeby zdjęcia wychodziły świetnie?",
    options: [
      { id: "ekran", label: "Przyjemny ekran" },
      { id: "aparat", label: "Świetne zdjęcia" },
    ],
  },
};

// Self-validating: a stored answer only counts if it's still one of the
// CURRENT options for this node. This is what makes "changing an earlier
// answer" cheap to reason about — callers never need to decide which later
// nodes to wipe. If a later node's own options don't depend on whatever
// changed, its stored answer just keeps matching and survives untouched; if
// they do depend on it (e.g. producent's options depend on marka), a stale
// answer stops matching and the node is correctly treated as unanswered
// again, without anyone having to track that dependency by hand.
function step(id, question, options, storedAnswer) {
  const answer = options.some((o) => o.id === storedAnswer) ? storedAnswer : null;
  return { id, question, options, answer };
}

export function resolvePath(answers) {
  const steps = [];
  const resolvedTags = new Set();
  let avoidanceCount = 0;

  // Pushes the step and returns its VALIDATED answer (not the raw stored
  // value) — every caller below must branch on this return value, never on
  // answers[id] directly, or a stale answer that fails validation will
  // still look truthy and crash/mislead the rest of the walk.
  function push(id, question, options) {
    const s = step(id, question, options, answers[id] ?? null);
    steps.push(s);
    return s.answer;
  }

  const budzet = push(
    "budzet",
    "Jak zazwyczaj podejmujesz decyzje przy zakupie sprzętu na lata?",
    BUDZET_OPTIONS
  );
  if (!budzet) return steps;
  const priceTier = BUDZET_OPTIONS.find((o) => o.id === budzet).tier;

  const priorytet1 = push(
    "priorytet1",
    "Gdy myślisz o nowym telefonie, która z tych rzeczy ma dla Ciebie bezwzględny priorytet?",
    PRIORYTET_OPTIONS
  );
  if (!priorytet1) return steps;
  resolvedTags.add(priorytet1);

  const remaining = PRIORYTET_OPTIONS.filter((o) => o.id !== priorytet1);
  const priorytet2Options = [...remaining, { id: "zostan", label: "Wszystko jedno – po prostu trzymajmy się mojego pierwszego wskazania." }];
  const priorytet2 = push(
    "priorytet2",
    "A gdyby Twój nowy telefon miał zaoferować jeszcze jeden miły atut w tle – co wybierasz?",
    priorytet2Options
  );
  if (!priorytet2) return steps;
  if (priorytet2 !== "zostan") resolvedTags.add(priorytet2);

  const markaQuestion = MARKA_QUESTIONS[steps.length % MARKA_QUESTIONS.length];
  const marka = push("marka", markaQuestion, MARKA_OPTIONS);
  if (!marka) return steps;
  const chosenMarka = MARKA_OPTIONS.find((o) => o.id === marka);
  if (chosenMarka.avoidance) avoidanceCount++;

  if (marka === "tak") {
    resolvedTags.add("marka");
    // Real mainstream brands from the data (brand_tier 1 in
    // telefony_merged.json) instead of a hand-picked list, plus an escape
    // hatch back toward "niszowa" for anything not in that short list.
    const producentOptions = [
      { id: "Apple", label: "Apple" },
      { id: "Samsung", label: "Samsung" },
      { id: "Xiaomi", label: "Xiaomi" },
      { id: "Motorola", label: "Motorola" },
      { id: "nietypowe", label: "Nietypowe — pokaż mi coś innego", niche: true },
    ];
    const producent = push("producent", "Który producent Cię interesuje?", producentOptions);
    if (!producent) return steps;
  }

  const humanOptions = HUMAN_OPTIONS.filter((o) => !o.tag || !resolvedTags.has(o.tag));
  const humanIsUseful = humanOptions.length > 1; // more than just "mix" left
  if (humanIsUseful) {
    const isRescue = avoidanceCount >= 1;
    const question = isRescue
      ? "Wygląda na to, że trudno Ci wybrać — powiedz chociaż, jak najczęściej wygląda Twój dzień z telefonem w dłoni?"
      : "Jak najczęściej wygląda Twój dzień z telefonem w dłoni?";
    const human = push("human", question, humanOptions);
    if (!human) return steps;
    const chosenHuman = humanOptions.find((o) => o.id === human);
    if (chosenHuman?.tag) resolvedTags.add(`inferred:${chosenHuman.tag}`);
  }

  // Generalized forced fallback: ask a forced pair only for a combination
  // we have real phrasing for. Any other leftover single axis just stays
  // unresolved rather than inventing a comparison with no honest phrasing —
  // same "skip if there's nothing real left to ask" principle as everywhere
  // else in this tree.
  const stillOpenAxes = PRIORYTET_OPTIONS.map((o) => o.id).filter(
    (tag) => !resolvedTags.has(tag) && !resolvedTags.has(`inferred:${tag}`)
  );
  for (const key of Object.keys(FORCED_PAIR_QUESTIONS)) {
    const [a, b] = key.split("|");
    if (stillOpenAxes.includes(a) && stillOpenAxes.includes(b)) {
      const { question, options } = FORCED_PAIR_QUESTIONS[key];
      const forced = push(`forced_${key}`, question, options);
      if (!forced) return steps;
      resolvedTags.add(forced);
      break; // one forced question is enough — same spirit as the old single bateria_wydajnosc node
    }
  }

  if (!resolvedTags.has("rozmiar_ekranu")) {
    const rozmiar = push("rozmiar_ekranu", "Jakie gabaryty smartfona są dla Ciebie najbardziej komfortowe?", ROZMIAR_OPTIONS);
    if (!rozmiar) return steps;
    resolvedTags.add("rozmiar_ekranu");

    if (rozmiar === "duzy" && priceTier === "premium") {
      const foldable = push(
        "foldable",
        "Interesuje Cię telefon, który się składa — duży ekran, ale mieści się w kieszeni?",
        FOLDABLE_OPTIONS
      );
      if (!foldable) return steps;
    }
  }

  steps.push({ id: "wynik", question: null, options: null, answer: "done" });
  return steps;
}
