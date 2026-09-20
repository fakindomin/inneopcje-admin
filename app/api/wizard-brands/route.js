import { NextResponse } from "next/server";
import { getProducentByTier } from "../../../lib/wizardBrands.js";

// Fetched once when the wizard mounts, before any question renders - the
// "producent" step needs this to know which brands are real choices in
// each price tier, and the whole tree is otherwise pure/synchronous.
export async function GET() {
  const producentByTier = await getProducentByTier();
  return NextResponse.json({ producentByTier });
}
