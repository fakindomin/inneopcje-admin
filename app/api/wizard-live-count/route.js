import { NextResponse } from "next/server";
import { resolvePath } from "../../../lib/wizardTree.js";
import { countMatchingPool } from "../../../lib/wizardMatch.js";
import { getProducentByTier } from "../../../lib/wizardBrands.js";
import { hasMeaningfulScreenRangeByTier } from "../../../lib/wizardScreenRange.js";

// TEST/temporary - added to answer "does the DB actually eliminate models
// as I answer, or just re-rank them?" live, during testing. Safe to delete
// this whole file (plus lib/wizardMatch.js's countMatchingPool, the
// profileSoFar wiring in lib/wizardTree.js, and the counter bit in
// components/PhoneWizard.js) once the test is done - nothing else in the
// app depends on any of it.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "invalid_answers" }, { status: 400 });
  }

  const [producentByTier, screenRangeByTier] = await Promise.all([
    getProducentByTier(),
    hasMeaningfulScreenRangeByTier(),
  ]);
  const steps = resolvePath(answers, producentByTier, screenRangeByTier);
  const last = steps[steps.length - 1];
  const profile = last?.id === "wynik" ? last.profile : last?.profileSoFar;

  const count = await countMatchingPool(profile);
  return NextResponse.json({ count });
}
