import { NextResponse } from "next/server";
import { resolvePath } from "../../../lib/wizardTreeTv.js";
import { matchTelewizor } from "../../../lib/wizardMatchTv.js";

// Mirrors app/api/wizard-match/route.js - resolvePath is re-run server-side
// as the only source of truth for what a given set of answers resolves to.
// Unlike telefony's route, wizardTreeTv's resolvePath takes no live-catalog
// args (its producent list is the static ALLOWED_BRANDS.telewizory, not a
// per-tier lookup), so there's no extra data to fetch before resolving.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "invalid_answers" }, { status: 400 });
  }

  const steps = resolvePath(answers);
  const wynikStep = steps[steps.length - 1];
  if (!wynikStep || wynikStep.id !== "wynik") {
    return NextResponse.json({ error: "incomplete" }, { status: 400 });
  }

  const product = await matchTelewizor(wynikStep.profile);
  return NextResponse.json({ product });
}
