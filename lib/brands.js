// Brands the manual-import prompt scopes itself to, and that pasted Gemini
// answers are validated against — mirrors the (now-disabled) bot repo's
// lib/brands.js so category scope stays the same under manual entry.
export const ALLOWED_BRANDS = {
  telefony: [
    "Samsung",
    "Apple",
    "Xiaomi",
    "Redmi",
    "POCO",
    "OnePlus",
    "Google",
    "Honor",
    "Motorola",
    "Oppo",
    "realme",
    "Nothing",
    "Sony",
    "Huawei",
    "Asus",
    "TCL",
    "ZTE",
    "CAT",
    "HAMMER",
  ],
  telewizory: [
    "Samsung",
    "LG",
    "Sony",
    "Philips",
    "TCL",
    "Hisense",
    "Panasonic",
    "Sharp",
    "Toshiba",
    "JVC",
    "Xiaomi",
    "Kruger&Matz",
    "Manta",
    "Grundig",
    "Blaupunkt",
    "Thomson",
    "Hyundai",
    "AOC",
    "BenQ",
    "Hitachi",
  ],
};

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
