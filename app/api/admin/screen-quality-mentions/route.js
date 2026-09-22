import { NextResponse } from "next/server";
import { getPool } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/adminAuth.js";

// Diagnostic, admin-only: is screen QUALITY (refresh rate, panel type,
// resolution, brightness) mentioned anywhere at all - `specs` has no such
// field (see specs-coverage), but the Redmi Note 12S example showed a cons
// entry mentioning "odświeżaniem ograniczonym do 90 Hz". This checks how
// often that kind of mention actually shows up across pros/cons/summary/
// verdict, and tries to pull a refresh-rate number out where it can, to
// see whether a real "best screen" priority is buildable from free text
// the way chipset performance was from specs.chipset.
const HZ_PATTERN = /(\d{2,3})\s*Hz/i;
const KEYWORD_PATTERN = /\bHz\b|AMOLED|OLED|IPS|LCD|rozdzielczo|jasno[sś]ci?|\bnit[oó]?w?\b|QHD|FHD|Full\s*HD|matryc/i;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.name, p.pros, p.cons, p.summary, p.verdict
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'telefony' AND p.status = 'published'`
  );

  let withAnyMention = 0;
  let withHzNumber = 0;
  const samples = [];

  for (const row of result.rows) {
    const texts = [
      ...(Array.isArray(row.pros) ? row.pros : []),
      ...(Array.isArray(row.cons) ? row.cons : []),
      row.summary || "",
      row.verdict || "",
    ];
    const matchingText = texts.find((t) => KEYWORD_PATTERN.test(t));
    if (matchingText) {
      withAnyMention++;
      const hzMatch = matchingText.match(HZ_PATTERN);
      if (hzMatch) withHzNumber++;
      if (samples.length < 15) {
        samples.push({ name: row.name, snippet: matchingText, extractedHz: hzMatch ? Number(hzMatch[1]) : null });
      }
    }
  }

  return NextResponse.json({
    totalProducts: result.rows.length,
    withAnyScreenMention: withAnyMention,
    withExtractableHzNumber: withHzNumber,
    samples,
  });
}
