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
  { id: "budzetowy", label: "Budżetowy" },
  { id: "sredni", label: "Średnia półka" },
  { id: "premium", label: "Premium" },
];

const PRIORYTET_OPTIONS = {
  budzetowy: [
    { id: "bateria", label: "Jak najdłuższy czas pracy na baterii", tag: "bateria" },
    { id: "ekran", label: "Duży ekran", tag: "rozmiar_ekranu" },
    { id: "cena", label: "Jak najniższa cena w tym przedziale", tag: null },
    { id: "brak", label: "Nie mam preferencji — pokaż najlepiej oceniany", tag: null, avoidance: true },
  ],
  sredni: [
    { id: "aparat", label: "Aparat", tag: "aparat" },
    { id: "bateria", label: "Bateria", tag: "bateria" },
    { id: "wydajnosc", label: "Wydajność (gry, aplikacje)", tag: "wydajnosc" },
    { id: "brak", label: "Nie mam preferencji — pokaż najlepiej oceniany", tag: null, avoidance: true },
  ],
  premium: [
    { id: "aparat", label: "Najlepszy aparat", tag: "aparat" },
    { id: "wydajnosc", label: "Wydajność (gry, obróbka wideo)", tag: "wydajnosc" },
    { id: "kompakt", label: "Kompaktowy design", tag: "rozmiar_ekranu" },
    { id: "brak", label: "Nie mam preferencji — pokaż najlepiej oceniany", tag: null, avoidance: true },
  ],
};

const MARKA_OPTIONS = [
  { id: "tak", label: "Tak, wolę sprawdzone, znane marki" },
  { id: "obojetnie", label: "Nie mam zdania — liczy się produkt", avoidance: true },
  { id: "niszowa", label: "Pokaż mi też mniej oczywiste, ale dobre marki" },
];

const HUMAN_OPTIONS = [
  { id: "zdjecia", label: "Głównie zdjęcia i social media", tag: "aparat" },
  { id: "granie", label: "Granie", tag: "wydajnosc" },
  { id: "rozmowy", label: "Dużo rozmów/wiadomości, długo poza domem bez ładowarki", tag: "bateria" },
  { id: "praca", label: "Praca, dużo aplikacji naraz", tag: "wydajnosc" },
  { id: "rozne", label: "Różnie, nie mam jednego głównego zastosowania", tag: null },
];

const ROZMIAR_OPTIONS = [
  { id: "kompakt", label: "Kompaktowy — łatwo mieści się w dłoni", tag: "rozmiar_ekranu" },
  { id: "duzy", label: "Duży — do multimediów i gier", tag: "rozmiar_ekranu" },
  { id: "brak", label: "Bez znaczenia", tag: null },
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
// if they do depend on it (e.g. priorytet1's options depend on budzet), a
// stale answer stops matching and the node is correctly treated as
// unanswered again, without anyone having to track that dependency by hand.
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
  // Ordered, deduped aparat/bateria/wydajnosc picks — separate from
  // resolvedTags (which also carries gating-only entries like the
  // "inferred:" prefix and the tagless "marka" marker) because this is
  // exactly what matching a real phone needs: which dimensions the user
  // actually singled out, in the order that reveals how much each one
  // matters to them.
  const tagPicks = [];
  let screenPreference = null;
  let producent = null;
  let foldableAnswer = null;
  let avoidanceCount = 0;

  function addTagPick(tag) {
    if (["aparat", "bateria", "wydajnosc"].includes(tag) && !tagPicks.includes(tag)) {
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

  const budzet = push("budzet", "Jaki budżet bierzesz pod uwagę?", BUDZET_OPTIONS);
  if (!budzet) return steps;

  const priorytetOptions = PRIORYTET_OPTIONS[budzet];
  const priorytet1 = push("priorytet1", "Co jest dla Ciebie najważniejsze?", priorytetOptions);
  if (!priorytet1) return steps;

  const chosen1 = priorytetOptions.find((o) => o.id === priorytet1);
  if (chosen1.avoidance) avoidanceCount++;
  if (chosen1.tag) {
    resolvedTags.add(chosen1.tag);
    // "ekran"/"kompakt" are the only option ids that ever carry this tag,
    // and each only exists in one tier's option list — so the id alone
    // tells us which direction was meant.
    if (chosen1.tag === "rozmiar_ekranu") screenPreference = priorytet1 === "ekran" ? "duzy" : "kompakt";
    else addTagPick(chosen1.tag);
  }

  if (!chosen1.avoidance) {
    const remaining = priorytetOptions.filter((o) => o.id !== priorytet1 && !o.avoidance);
    if (remaining.length > 0) {
      const priorytet2Options = [...remaining, { id: "brak2", label: "Bez znaczenia", tag: null }];
      const priorytet2 = push("priorytet2", "A czy zależy Ci jeszcze na czymś z tego?", priorytet2Options);
      if (!priorytet2) return steps;
      const chosen2 = priorytet2Options.find((o) => o.id === priorytet2);
      if (chosen2.tag) {
        resolvedTags.add(chosen2.tag);
        if (chosen2.tag === "rozmiar_ekranu") screenPreference = priorytet2 === "ekran" ? "duzy" : "kompakt";
        else addTagPick(chosen2.tag);
      }
    }
  }

  const marka = push("marka", "Czy zależy Ci na znanej marce?", MARKA_OPTIONS);
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
      const producentAnswer = push("producent", "Który producent Cię interesuje?", producentOptions);
      if (!producentAnswer) return steps;
      producent = producentAnswer;
    }
  }

  const humanOptions = HUMAN_OPTIONS.filter((o) => !o.tag || !resolvedTags.has(o.tag));
  const humanIsUseful = humanOptions.length > 1; // more than just "rozne" left
  if (humanIsUseful) {
    const isRescue = avoidanceCount >= 2;
    const question = isRescue
      ? "Wygląda na to, że trudno Ci wybrać — powiedz chociaż, jak najczęściej używasz telefonu?"
      : "Jak najczęściej używasz telefonu?";
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

  if (!resolvedTags.has("rozmiar_ekranu")) {
    const rozmiar = push("rozmiar_ekranu", "Jaki rozmiar ekranu wolisz?", ROZMIAR_OPTIONS);
    if (!rozmiar) return steps;
    resolvedTags.add("rozmiar_ekranu");
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
