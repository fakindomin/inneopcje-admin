import { NextResponse } from "next/server";
import { getProducentByTier } from "../../../lib/wizardBrands.js";
import { hasMeaningfulScreenRangeByTier } from "../../../lib/wizardScreenRange.js";

// Fetched once when the wizard mounts, before any question renders - the
// "producent" step needs this to know which brands are real choices in
// each price tier, and "rozmiar_ekranu" needs to know whether that tier's
// recent catalog even spans a real screen-size range - the whole tree is
// otherwise pure/synchronous.
export async function GET() {
  const [producentByTier, screenRangeByTier] = await Promise.all([
    getProducentByTier(),
    hasMeaningfulScreenRangeByTier(),
  ]);
  return NextResponse.json({ producentByTier, screenRangeByTier });
}
