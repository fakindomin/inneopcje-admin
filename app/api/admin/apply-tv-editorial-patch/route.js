import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { applyEditorialPatch } from "../../../../lib/editorialPatch.js";
import tvEditorialPatch from "../../../../data/telewizory_editorial_patch.json" with { type: "json" };

// One-off: applies data/telewizory_editorial_patch.json (944 freshly
// generated verdict/summary/pros/cons entries for the telewizory catalog)
// straight from the repo, so it can be triggered with a single logged-in
// browser visit instead of pasting/uploading a ~1MB payload through
// EditorialPatchForm's textarea - that path kept failing before the
// underlying patchEditorial timeout (see lib/editorialPatch.js) was fixed,
// and staying on the giant-paste path was still needlessly fragile even
// after the fix. Safe to hit more than once - applyEditorialPatch is a
// full REPLACE per slug, so a repeat run is a no-op.
export const maxDuration = 60;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const outcome = await applyEditorialPatch(tvEditorialPatch);
  return NextResponse.json({
    message: `Zaktualizowano ${outcome.updated}, nie znaleziono ${outcome.notFound}, błędów ${outcome.failed} — z ${outcome.total} pozycji.`,
    updated: outcome.updated,
    notFound: outcome.notFound,
    failed: outcome.failed,
    total: outcome.total,
    notFoundSlugs: outcome.results.filter((r) => r.status === "not_found").map((r) => r.slug),
    errorSlugs: outcome.results.filter((r) => r.status === "error").map((r) => ({ slug: r.slug, note: r.note })),
  });
}
