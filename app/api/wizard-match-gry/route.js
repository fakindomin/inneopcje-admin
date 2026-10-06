import { NextResponse } from "next/server";
import { resolvePath } from "../../../lib/wizardTreeGry.js";
import { matchGre } from "../../../lib/wizardMatchGry.js";

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
  const product = await matchGre(wynikStep.profile);
  return NextResponse.json({ product });
}
