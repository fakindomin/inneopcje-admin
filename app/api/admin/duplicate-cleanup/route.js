import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminAuth.js";
import { findDuplicateGroups } from "../../../../lib/duplicateCleanup.js";

// Admin-only: same duplicate detection as /api/admin/duplicate-check, but
// shaped for the /admin/duplicate-cleanup UI - includes product id + a
// completeness score per candidate so the page can pre-select "keep the
// better-populated copy" while a human still confirms before anything is
// touched.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const groups = await findDuplicateGroups();
  return NextResponse.json(groups);
}
