// No category currently has a brand allowlist (telefony/telewizory's were
// retired along with those categories) - normalizeBrand's fallback already
// handles that case (pass the brand through unchanged, trimmed), which is
// the right behavior for gry: game studios/publishers are an open set, not
// a fixed list to validate against.
export const ALLOWED_BRANDS = {};

// Case-insensitively matches `rawBrand` against the category's allowlist and
// returns the canonical spelling, or null if it's not on the list.
// Categories without a list pass through unchanged.
export function normalizeBrand(category, rawBrand) {
  const list = ALLOWED_BRANDS[category];
  if (!list) return (rawBrand || "").trim() || null;

  const trimmed = (rawBrand || "").trim();
  if (!trimmed) return null;
  return list.find((b) => b.toLowerCase() === trimmed.toLowerCase()) ?? null;
}
