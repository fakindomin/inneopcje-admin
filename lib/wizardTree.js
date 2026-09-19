import { ALLOWED_BRANDS } from "./brands.js";

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

function step(id, question, options, answer) {
  return { id, question, options, answer: answer ?? null };
}

export function resolvePath(answers) {
  const steps = [];
  const resolvedTags = new Set();
  let avoidanceCount = 0;

  const budzet = answers.budzet ?? null;
  steps.push(step("budzet", "Jaki budżet bierzesz pod uwagę?", BUDZET_OPTIONS, budzet));
  if (!budzet) return steps;

  const priorytetOptions = PRIORYTET_OPTIONS[budzet];
  const priorytet1 = answers.priorytet1 ?? null;
  steps.push(step("priorytet1", "Co jest dla Ciebie najważniejsze?", priorytetOptions, priorytet1));
  if (!priorytet1) return steps;

  const chosen1 = priorytetOptions.find((o) => o.id === priorytet1);
  if (chosen1.avoidance) avoidanceCount++;
  if (chosen1.tag) resolvedTags.add(chosen1.tag);

  if (!chosen1.avoidance) {
    const remaining = priorytetOptions.filter((o) => o.id !== priorytet1 && !o.avoidance);
    if (remaining.length > 0) {
      const priorytet2Options = [...remaining, { id: "brak2", label: "Bez znaczenia", tag: null }];
      const priorytet2 = answers.priorytet2 ?? null;
      steps.push(step("priorytet2", "A czy zależy Ci jeszcze na czymś z tego?", priorytet2Options, priorytet2));
      if (!priorytet2) return steps;
      const chosen2 = priorytet2Options.find((o) => o.id === priorytet2);
      if (chosen2.tag) resolvedTags.add(chosen2.tag);
    }
  }

  const marka = answers.marka ?? null;
  steps.push(step("marka", "Czy zależy Ci na znanej marce?", MARKA_OPTIONS, marka));
  if (!marka) return steps;
  const chosenMarka = MARKA_OPTIONS.find((o) => o.id === marka);
  if (chosenMarka.avoidance) avoidanceCount++;

  if (marka === "tak") {
    resolvedTags.add("marka");
    const producentOptions = ALLOWED_BRANDS.telefony.map((b) => ({ id: b, label: b }));
    const producent = answers.producent ?? null;
    steps.push(step("producent", "Który producent Cię interesuje?", producentOptions, producent));
    if (!producent) return steps;
  }

  const humanOptions = HUMAN_OPTIONS.filter((o) => !o.tag || !resolvedTags.has(o.tag));
  const humanIsUseful = humanOptions.length > 1; // more than just "rozne" left
  if (humanIsUseful) {
    const human = answers.human ?? null;
    const isRescue = avoidanceCount >= 2;
    const question = isRescue
      ? "Wygląda na to, że trudno Ci wybrać — powiedz chociaż, jak najczęściej używasz telefonu?"
      : "Jak najczęściej używasz telefonu?";
    steps.push(step("human", question, humanOptions, human));
    if (!human) return steps;
    const chosenHuman = humanOptions.find((o) => o.id === human);
    if (chosenHuman?.tag) resolvedTags.add(`inferred:${chosenHuman.tag}`);
  }

  const needsBatteryVsPerf = !resolvedTags.has("bateria") && !resolvedTags.has("wydajnosc");
  if (needsBatteryVsPerf) {
    const options = [
      { id: "bateria", label: "Bateria" },
      { id: "wydajnosc", label: "Szybsze działanie" },
    ];
    const bw = answers.bateria_wydajnosc ?? null;
    steps.push(
      step("bateria_wydajnosc", "Co bardziej Cię wkurza: szukanie ładowarki, czy czekanie aż telefon się nie zawiesi?", options, bw)
    );
    if (!bw) return steps;
    resolvedTags.add(bw === "bateria" ? "bateria" : "wydajnosc");
  }

  if (!resolvedTags.has("rozmiar_ekranu")) {
    const rozmiar = answers.rozmiar_ekranu ?? null;
    steps.push(step("rozmiar_ekranu", "Jaki rozmiar ekranu wolisz?", ROZMIAR_OPTIONS, rozmiar));
    if (!rozmiar) return steps;
    resolvedTags.add("rozmiar_ekranu");

    if (rozmiar === "duzy" && budzet === "premium") {
      const foldable = answers.foldable ?? null;
      steps.push(
        step(
          "foldable",
          "Interesuje Cię telefon, który się składa — duży ekran, ale mieści się w kieszeni?",
          FOLDABLE_OPTIONS,
          foldable
        )
      );
      if (!foldable) return steps;
    }
  }

  steps.push({ id: "wynik", question: null, options: null, answer: "done" });
  return steps;
}
