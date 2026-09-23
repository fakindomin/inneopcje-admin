import { NextResponse } from "next/server";
import { resolvePath } from "../../../lib/wizardTree.js";
import { matchTelefon } from "../../../lib/wizardMatch.js";
import { getProducentByTier } from "../../../lib/wizardBrands.js";
import { hasMeaningfulScreenRangeByTier } from "../../../lib/wizardScreenRange.js";

// The client sends raw answers, never a pre-built profile — resolvePath is
// re-run here so the server is the only source of truth for what a given
// set of answers actually resolves to, the same way it already is in the
// browser. A client that hasn't really reached "wynik" (missing/invalid
// answers) gets a 400 instead of a query built from whatever it claims.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "invalid_answers" }, { status: 400 });
  }

  // Must match the same live data the client used to build its "producent"
  // and "rozmiar_ekranu" steps, or a legitimately-given answer would fail
  // resolvePath's own validation here and wrongly look incomplete.
  const [producentByTier, screenRangeByTier] = await Promise.all([
    getProducentByTier(),
    hasMeaningfulScreenRangeByTier(),
  ]);
  const steps = resolvePath(answers, producentByTier, screenRangeByTier);
  const wynikStep = steps[steps.length - 1];
  if (!wynikStep || wynikStep.id !== "wynik") {
    return NextResponse.json({ error: "incomplete" }, { status: 400 });
  }

  const { product, otherBrandPicks } = await matchTelefon(wynikStep.profile);
  return NextResponse.json({ product, otherBrandPicks });
}
