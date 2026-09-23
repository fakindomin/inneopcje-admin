// Prototype tree for the telewizory "Nie wiem czego chcę" flow - same
// architecture as lib/wizardTree.js (telefony), deliberately not wired to
// any live data yet (no producentByTier-style per-tier lookup, no match
// endpoint): this is purely the question flow, for review before hooking
// up real matching. Producent options come from the static
// ALLOWED_BRANDS.telewizory list rather than a live "does the catalog
// actually carry this brand in this tier" check.
import { ALLOWED_BRANDS } from "./brands.js";

export const MAX_PRODUCENT = 3;

// Verbatim from telefony - already generic ("sprzętu", not "telefonu"),
// so the philosophy-based budget framing and its 1:1 mapping onto
// price_tier (budzetowy/sredni/premium) carries over without change.
const BUDZET_OPTIONS = [
  { id: "budzetowy", label: "Szukam rozsądnego minimum" },
  { id: "sredni", label: "Zależy mi na wysokiej opłacalności" },
  { id: "premium", label: "Inwestuję w bezkompromisowe wrażenia" },
];

// The three gradable dimensions telewizory specs can actually back up
// (see lib/displayTechTiers.js for "obraz", refresh_rate_hz/hdmi_2_1_ports
// for "gaming", audio_watts for "dzwiek") - telefony's fourth dimension
// (jakosc_ekranu) has no TV equivalent since screen quality already IS
// "obraz" here, not a separate axis.
const PRIORYTET_OPTIONS = [
  { id: "obraz", label: "Perfekcyjny obraz – głęboka czerń i żywe kolory.", tag: "obraz" },
  { id: "gaming", label: "Płynność i błyskawiczna reakcja – gry i sport bez rozmycia.", tag: "gaming" },
  { id: "dzwiek", label: "Dźwięk, który nie wymaga dodatkowych głośników.", tag: "dzwiek" },
];

const PRIORYTET2_LABELS = {
  obraz: "Ładny, żywy obraz – nawet jeśli to nie najważniejsze.",
  gaming: "Płynność w tle, gdyby zdarzyło się zagrać.",
  dzwiek: "Przyzwoity dźwięk bez dokładania sprzętu.",
};

// Verbatim from telefony - generic wording, no telefony-specific nouns.
const MARKA_OPTIONS = [
  { id: "tak", label: "Stawiam na popularne marki, do których mam zaufanie." },
  { id: "niszowa", label: "Liczy się działanie, a nie marka" },
  { id: "obojetnie", label: "Wybierzmy najlepszy sprzęt w budżecie, bez względu na logo.", avoidance: true },
];

// Covert closer for "obraz" if it's still unresolved after the priority
// steps (same role as telefony's HUMAN_OPTIONS) - dark room vs bright room
// maps directly onto contrast/OLED vs peak-brightness/QLED once real
// matching is wired up; "cały dzień" is the neutral, untagged option.
const SRODOWISKO_OPTIONS = [
  {
    id: "wieczor",
    label: "Głównie wieczorami i w nocy – lubię zgasić światło i zrobić sobie prawdziwy seans.",
    tag: "obraz",
  },
  {
    id: "dzien",
    label: "W ciągu dnia i przy świetle – w jasnym salonie, często przy odsłoniętych roletach.",
    tag: "obraz",
  },
  { id: "caly_dzien", label: "Od rana do nocy – leci w tle przy normalnym, dziennym i wieczornym życiu domu.", tag: null },
];

const ROZMIAR_OPTIONS = [
  { id: "maly", label: "Kameralny kącik – szukam czegoś mniejszego, co nie zdominuje małego pokoju czy sypialni (43\"–50\")." },
  { id: "sredni_rozmiar", label: "Złoty środek – klasyczny, uniwersalny rozmiar do większości polskich salonów (55\"–65\")." },
  { id: "duzy", label: "Prawdziwe kino domowe – mam dużą ścianę i chcę, żeby ekran robił ogromne wrażenie! (75\"+)." },
];

// Self-validating, same as telefony's step() - a stored answer only counts
// if it's still one of the CURRENT options for this node.
function step(id, question, options, storedAnswer, stepOpts = {}) {
  if (stepOpts.multiSelect) {
    const maxSelect = stepOpts.maxSelect ?? Infinity;
    const valid = (Array.isArray(storedAnswer) ? storedAnswer : [])
      .filter((a) => options.some((o) => o.id === a))
      .slice(0, maxSelect);
    return { id, question, options, answer: valid.length > 0 ? valid : null, multiSelect: true, maxSelect };
  }
  const answer = options.some((o) => o.id === storedAnswer) ? storedAnswer : null;
  return { id, question, options, answer };
}

export function resolvePath(answers) {
  const steps = [];
  const resolvedTags = new Set();
  const tagPicks = [];
  let screenPreference = null;
  let marka = null;
  let producent = null;

  function addTagPick(tag) {
    if (["obraz", "gaming", "dzwiek"].includes(tag) && !tagPicks.includes(tag)) {
      tagPicks.push(tag);
    }
  }

  function push(id, question, options, stepOpts) {
    const s = step(id, question, options, answers[id] ?? null, stepOpts);
    steps.push(s);
    return s.answer;
  }

  const budzet = push("budzet", "Jak zazwyczaj podejmujesz decyzje przy zakupie sprzętu na lata?", BUDZET_OPTIONS);
  if (!budzet) return steps;

  const priorytet1 = push(
    "priorytet1",
    "Gdy myślisz o nowym telewizorze, co ma dla Ciebie bezwzględny priorytet?",
    PRIORYTET_OPTIONS
  );
  if (!priorytet1) return steps;

  const chosen1 = PRIORYTET_OPTIONS.find((o) => o.id === priorytet1);
  addTagPick(chosen1.tag);
  resolvedTags.add(chosen1.tag);

  const remainingTags = ["obraz", "gaming", "dzwiek"].filter((tag) => tag !== chosen1.tag);
  const priorytet2Options = [
    ...remainingTags.map((tag) => ({ id: tag, label: PRIORYTET2_LABELS[tag], tag })),
    { id: "brak2", label: "Nic więcej mnie nie interesuje", tag: null },
  ];
  const priorytet2 = push(
    "priorytet2",
    "A gdyby Twój nowy telewizor miał zaoferować jeszcze jeden miły atut w tle – co wybierasz?",
    priorytet2Options
  );
  if (!priorytet2) return steps;
  const chosen2 = priorytet2Options.find((o) => o.id === priorytet2);
  if (chosen2.tag) {
    addTagPick(chosen2.tag);
    resolvedTags.add(chosen2.tag);
  }

  marka = push("marka", "Jakie masz podejście do logo i producenta na obudowie?", MARKA_OPTIONS);
  if (!marka) return steps;

  if (marka === "tak") {
    const producentOptions = ALLOWED_BRANDS.telewizory.map((brand) => ({ id: brand, label: brand }));
    const producentAnswer = push(
      "producent",
      "Którzy producenci najbardziej Cię przekonują? (max 3)",
      producentOptions,
      { multiSelect: true, maxSelect: MAX_PRODUCENT }
    );
    if (!producentAnswer) return steps;
    producent = producentAnswer;
  }

  const srodowiskoOptions = SRODOWISKO_OPTIONS.filter((o) => !o.tag || !resolvedTags.has(o.tag));
  if (srodowiskoOptions.length > 1) {
    const srodowisko = push(
      "srodowisko",
      "Kiedy Twój telewizor będzie najczęściej pracował na pełnych obrotach?",
      srodowiskoOptions
    );
    if (!srodowisko) return steps;
    const chosenSrodowisko = srodowiskoOptions.find((o) => o.id === srodowisko);
    if (chosenSrodowisko?.tag) addTagPick(chosenSrodowisko.tag);
  }

  const rozmiar = push("rozmiar_ekranu", "Jak dużo miejsca masz w swoim kadrze na nowy ekran?", ROZMIAR_OPTIONS);
  if (!rozmiar) return steps;
  screenPreference = rozmiar;

  steps.push({
    id: "wynik",
    question: null,
    options: null,
    answer: "done",
    profile: { budzet, tags: tagPicks, screenPreference, marka, producent },
  });
  return steps;
}
