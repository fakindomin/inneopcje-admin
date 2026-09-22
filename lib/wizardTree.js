// Prototype tree for the "Nie wiem czego chcę" flow — telefony only. Pure
// logic, no product data: given the answers so far, resolve() returns the
// ordered list of steps on the CURRENT active path. Each step is either
// answered (has `answer`) or is the one currently awaiting input (`answer`
// is null) — resolve() stops there and doesn't invent further steps past
// an unanswered one.
//
// This is a first-pass simplification of the full design in the
// project_wizard_flowchart memory: tag-based mutual exclusion and the
// "skip node if <2 meaningful options remain" rule are implemented; the
// avoidance-counter timing (early rescue vs. late enrichment) is
// simplified to "always ask after marka/producent", and phrasing variants
// aren't wired up yet. Good enough to judge the interaction/visual feel.

const BUDZET_OPTIONS = [
  {
    id: "budzetowy",
    label: "Szukam rozsądnego minimum – ma działać dobrze, bez przepłacania za funkcje, z których i tak nie skorzystam.",
  },
  {
    id: "sredni",
    label: "Mój cel to wysoka opłacalność – chcę świetnych możliwości w uczciwej, zrównoważonej cenie.",
  },
  {
    id: "premium",
    label: "Inwestuję w bezkompromisowe wrażenia – oczekuję technologii z najwyższej półki.",
  },
];

// One list, the same for every budget — a budget-specific split used to
// mean "duży ekran" in one tier and "kompaktowy design" in another for
// what was really the same underlying tag, which is exactly the kind of
// inconsistency this was rewritten to remove. "Ekran" here means SCREEN
// QUALITY (panel type, sharpness/smoothness), on equal footing with
// aparat/wydajność/bateria — "best screen for the money", not physical
// size. Size is a separate, always-asked, non-competing preference (the
// dedicated "rozmiar_ekranu" step below): picking ekran as a priority only
// says quality matters, it says nothing about kompakt vs duży.
const PRIORYTET_OPTIONS = [
  {
    id: "ekran",
    label: "Ekran, na który patrzy się z czystą przyjemnością – ostre kolory, wysoka płynność i świetna jasność w słońcu.",
    tag: "jakosc_ekranu",
  },
  {
    id: "aparat",
    label: "Aparat, który po prostu robi świetne, ostre zdjęcia i wideo bez ciągłego kombinowania w ustawieniach.",
    tag: "aparat",
  },
  {
    id: "bateria",
    label: "Mocna bateria, która wyciągnie intensywny dzień bez stresu o szukanie ładowarki.",
    tag: "bateria",
  },
  {
    id: "wydajnosc",
    label: "Błyskawiczne działanie – brak jakichkolwiek przycięć przy przełączaniu się między aplikacjami.",
    tag: "wydajnosc",
  },
  { id: "brak", label: "Nie mam wyraźnej preferencji — pokaż najlepiej oceniany", tag: null, avoidance: true },
];

// Priorytet #2 reuses the same four tags but with fresh wording (each tag
// already had its "main priority" phrasing said once in PRIORYTET_OPTIONS)
// - and deliberately never re-offers "ekran": screen quality only ever
// competes as the #1 priority, never as a secondary one.
const PRIORYTET2_LABELS = {
  aparat: "Chcę po prostu wyciągnąć go z kieszeni i od razu złapać ładny, ostry kadr.",
  bateria: "Chcę przestać się martwić, czy dotrwa ze mną bez ładowania do końca dnia.",
  wydajnosc: "Chcę, żeby płynnie śmigał przy przeskakiwaniu między wieloma rzeczami naraz.",
};

const MARKA_OPTIONS = [
  { id: "tak", label: "Stawiam na sprawdzone klasyki – wolę znane marki, do których mam zaufanie." },
  { id: "niszowa", label: "Pokaż mi coś mniej oczywistego – liczy się to, jak telefon działa, a nie marka na obudowie." },
  {
    id: "obojetnie",
    label: "Otwarta głowa – chętnie zobaczę najlepszy sprzęt w moim budżecie, niezależnie od logo.",
    avoidance: true,
  },
];

// Drops the earlier "granie"/"praca" (wydajność) options on purpose - this
// question now only ever infers aparat/bateria covertly; wydajność, when
// still unresolved at this point, gets its own explicit forced choice in
// the dedicated "bateria_wydajnosc" step below instead of a covert one here.
const HUMAN_OPTIONS = [
  {
    id: "zdjecia",
    label: "Wyciągam go głównie po to, by złapać fajny kadr, wrzucić coś do sieci lub sprawdzić co słychać na socialach.",
    tag: "aparat",
  },
  {
    id: "ruchu",
    label: "Ciągle w ruchu – dużo dzwonię, piszę i jestem poza domem bez ciągłego dostępu do ładowarki.",
    tag: "bateria",
  },
  {
    id: "rozne",
    label: "Klasyczny mix do wszystkiego – po trochu internetu, multimediów i sprawdzania wiadomości.",
    tag: null,
  },
];

// Physical size preference is read directly off the answer id (kompakt/
// sredni_rozmiar/duzy/brak) by the dedicated step below, not through `.tag`
// like the priority options - these entries carry no tag on purpose, since
// size is never a tagPicks priority, only the late screenValue() tiebreak
// in lib/wizardMatch.js.
const ROZMIAR_OPTIONS = [
  {
    id: "kompakt",
    label: "Kompaktowy i zgrabny – chcę łatwo obsługiwać go jedną dłonią i bez problemu schować do kieszeni.",
  },
  {
    id: "sredni_rozmiar",
    label: "Złoty środek – uniwersalna wielkość do wygodnego czytania, oglądania i codziennego użytku.",
  },
  {
    id: "duzy",
    label: "Duży ekran do multimediów – zależy mi na jak największej przestrzeni do filmów, czytania i gier.",
  },
];

const FOLDABLE_OPTIONS = [
  { id: "skladany", label: "Tak, interesuje mnie coś nietypowego (składany)" },
  { id: "klasyczny", label: "Nie, wolę klasyczny, płaski ekran" },
];

// Self-validating: a stored answer only counts if it's still one of the
// CURRENT options for this node. This is what makes "changing an earlier
// answer" cheap to reason about — callers never need to decide which later
// nodes to wipe. If a later node's own options don't depend on whatever
// changed, its stored answer just keeps matching and survives untouched;
// if they do depend on it, a stale answer stops matching and the node is
// correctly treated as unanswered again, without anyone having to track
// that dependency by hand.
function step(id, question, options, storedAnswer) {
  const answer = options.some((o) => o.id === storedAnswer) ? storedAnswer : null;
  return { id, question, options, answer };
}

// producentByTier: { budzetowy: [...brands], sredni: [...], premium: [...] }
// - which mainstream brands the catalog actually carries in each price
// tier right now, fetched live by the caller (see lib/wizardBrands.js).
// Defaults to empty so this stays callable without it (e.g. tests), which
// simply means the "producent" step never has anything concrete to offer.
export function resolvePath(answers, producentByTier = {}) {
  const steps = [];
  const resolvedTags = new Set();
  // Ordered, deduped priority picks — separate from resolvedTags (which
  // also carries gating-only entries like the "inferred:" prefix and the
  // tagless "marka" marker) because this is exactly what matching a real
  // phone needs: which dimensions the user actually singled out, in the
  // order that reveals how much each one matters. A tag's POSITION here is
  // its whole priority - the matching engine ranks candidates by tags[0]
  // outright, tags[1] only on a tie, and so on, so a tag inferred later
  // (e.g. from the "human" usage question) is never treated as weaker
  // just for arriving indirectly - it's simply whatever position it lands
  // in, same as an explicitly picked one.
  const tagPicks = [];
  let screenPreference = null;
  let producent = null;
  let foldableAnswer = null;
  let avoidanceCount = 0;

  function addTagPick(tag) {
    if (["aparat", "bateria", "wydajnosc", "jakosc_ekranu"].includes(tag) && !tagPicks.includes(tag)) {
      tagPicks.push(tag);
    }
  }

  // Pushes the step and returns its VALIDATED answer (not the raw stored
  // value) — every caller below must branch on this return value, never on
  // answers[id] directly, or a stale answer that fails validation will
  // still look truthy and crash/mislead the rest of the walk.
  function push(id, question, options) {
    const s = step(id, question, options, answers[id] ?? null);
    steps.push(s);
    return s.answer;
  }

  const budzet = push("budzet", "Jak zazwyczaj podejmujesz decyzje przy zakupie sprzętu na lata?", BUDZET_OPTIONS);
  if (!budzet) return steps;

  const priorytet1 = push(
    "priorytet1",
    "Gdy myślisz o nowym telefonie, która z tych rzeczy ma dla Ciebie bezwzględny priorytet?",
    PRIORYTET_OPTIONS
  );
  if (!priorytet1) return steps;

  const chosen1 = PRIORYTET_OPTIONS.find((o) => o.id === priorytet1);
  if (chosen1.avoidance) avoidanceCount++;
  if (chosen1.tag) {
    addTagPick(chosen1.tag);
    resolvedTags.add(chosen1.tag);
  }

  if (!chosen1.avoidance) {
    // "ekran" (jakosc_ekranu) never reappears here - see PRIORYTET2_LABELS.
    const remainingTags = ["aparat", "bateria", "wydajnosc"].filter((tag) => tag !== chosen1.tag);
    if (remainingTags.length > 0) {
      const priorytet2Options = [
        ...remainingTags.map((tag) => ({ id: tag, label: PRIORYTET2_LABELS[tag], tag })),
        {
          id: "brak2",
          label: "Wszystko jedno – po prostu trzymajmy się mojego pierwszego wskazania.",
          tag: null,
        },
      ];
      const priorytet2 = push(
        "priorytet2",
        "A gdyby Twój nowy telefon miał zaoferować jeszcze jeden miły atut w tle – co wybierasz?",
        priorytet2Options
      );
      if (!priorytet2) return steps;
      const chosen2 = priorytet2Options.find((o) => o.id === priorytet2);
      if (chosen2.tag) {
        addTagPick(chosen2.tag);
        resolvedTags.add(chosen2.tag);
      }
    }
  }

  const marka = push("marka", "Jakie masz podejście do logo i producenta na obudowie?", MARKA_OPTIONS);
  if (!marka) return steps;
  const chosenMarka = MARKA_OPTIONS.find((o) => o.id === marka);
  if (chosenMarka.avoidance) avoidanceCount++;

  if (marka === "tak") {
    resolvedTags.add("marka");
    // Only brands the catalog actually carries IN THIS PRICE TIER, plus an
    // escape hatch for anyone whose brand isn't among them — a fixed
    // Samsung/Apple/Xiaomi list used to dangle options the store simply
    // doesn't have in that segment (no budget Apple, no Xiaomi outside
    // premium). See lib/wizardBrands.js for how this is fetched.
    const knownBrands = producentByTier[budzet] ?? [];
    const producentOptions = [
      ...knownBrands.map((brand) => ({ id: brand, label: brand })),
      { id: "nietypowe", label: "Nietypowe — pokaż mi coś innego", niche: true },
    ];
    // Skip asking if the catalog has no well-known brand at all in this
    // tier yet — "który producent" with only the escape hatch left isn't a
    // real question (same "skip if <2 meaningful options" rule as human).
    if (producentOptions.length > 1) {
      const producentAnswer = push(
        "producent",
        "Którzy producenci najbardziej przekonują Cię swoimi telefonami?",
        producentOptions
      );
      if (!producentAnswer) return steps;
      producent = producentAnswer;
    }
  }

  const humanOptions = HUMAN_OPTIONS.filter((o) => !o.tag || !resolvedTags.has(o.tag));
  const humanIsUseful = humanOptions.length > 1; // more than just "rozne" left
  if (humanIsUseful) {
    const isRescue = avoidanceCount >= 2;
    const question = isRescue
      ? "Wygląda na to, że trudno Ci wybrać — powiedz chociaż: jak najczęściej wygląda Twój dzień z telefonem w dłoni?"
      : "Jak najczęściej wygląda Twój dzień z telefonem w dłoni?";
    const human = push("human", question, humanOptions);
    if (!human) return steps;
    const chosenHuman = humanOptions.find((o) => o.id === human);
    if (chosenHuman?.tag) {
      resolvedTags.add(`inferred:${chosenHuman.tag}`);
      addTagPick(chosenHuman.tag);
    }
  }

  const needsBatteryVsPerf = !resolvedTags.has("bateria") && !resolvedTags.has("wydajnosc");
  if (needsBatteryVsPerf) {
    const options = [
      { id: "bateria", label: "Bateria" },
      { id: "wydajnosc", label: "Szybsze działanie" },
    ];
    const bw = push(
      "bateria_wydajnosc",
      "Co bardziej Cię wkurza: szukanie ładowarki, czy czekanie aż telefon się nie zawiesi?",
      options
    );
    if (!bw) return steps;
    const bwTag = bw === "bateria" ? "bateria" : "wydajnosc";
    resolvedTags.add(bwTag);
    addTagPick(bwTag);
  }

  // Always asked, regardless of whether ekran was picked as a priority
  // above — that only established how much it matters, not the direction.
  const rozmiar = push(
    "rozmiar_ekranu",
    "Jakie gabaryty smartfona są dla Ciebie najbardziej komfortowe?",
    ROZMIAR_OPTIONS
  );
  if (!rozmiar) return steps;
  screenPreference = rozmiar;

  if (rozmiar === "duzy" && budzet === "premium") {
    const foldable = push(
      "foldable",
      "Interesuje Cię telefon, który się składa — duży ekran, ale mieści się w kieszeni?",
      FOLDABLE_OPTIONS
    );
    if (!foldable) return steps;
    foldableAnswer = foldable;
  }

  // Everything a real product match needs, in one place — the profile a
  // matching engine reads instead of re-deriving this same walk itself.
  steps.push({
    id: "wynik",
    question: null,
    options: null,
    answer: "done",
    profile: { budzet, tags: tagPicks, screenPreference, marka, producent, foldable: foldableAnswer },
  });
  return steps;
}
