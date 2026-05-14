// Name → image-path lookup for catalog_items.
//
// Drop image files at /public/products/catalog/<filename> and the
// portal shop will display them automatically. Keys MUST match the
// `name` column in Supabase catalog_items exactly (case + spacing
// + punctuation). Add a new entry here when you want an item to show
// in the supplements tab (which is "pic-only").
//
// To check what's currently in DB:
//   node scripts/list_catalog_items.mjs   (or query Supabase directly)

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // ─────────────────────────────────────────────────────────────
  // Drop files in /public/products/catalog/ and reference them here.
  // Examples (uncomment + add real files when you have them):
  //
  // "LEVRONE levrone gold whey 2 kg chocolate": "/products/catalog/levrone-gold-whey-2kg-chocolate.jpg",
  // "OLIMP Whey Protein Complex 100%-chc-700g": "/products/catalog/olimp-whey-complex-chocolate-700g.jpg",
  // "YAVA LABS ISO WHEY 1 kg Chocolate Ice Cream": "/products/catalog/yava-iso-whey-chocolate.jpg",
  // ─────────────────────────────────────────────────────────────
};

export function resolveProductImage(name: string): string | null {
  return PRODUCT_IMAGE_MAP[name] ?? null;
}
