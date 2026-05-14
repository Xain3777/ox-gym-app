// Name → image-path lookup for catalog_items.
//
// Keys MUST match the `name` column in Supabase catalog_items exactly
// (case + spacing + punctuation). When several flavors of one product
// share the same packaging photo, map each flavor to the same file.
//
// Drop new files in /public/products/supplements/ and add a line here.

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // ── LEVRONE ANABOLIC ─────────────────────────────────────────
  "LEVRONE anabolic Amino 300 tabs": "/products/supplements/anabolic-amino.jpeg",
  "LEVRONE anabolic crea 10 207 g mango-lemon": "/products/supplements/anabolic-crea10.jpeg",
  "LEVRONE anabolic cream of rice 2 kg cherry-apple": "/products/supplements/anabolic-cream-of-rice.jpeg",
  "LEVRONE anabolic cream of rice 2 kg forest berry": "/products/supplements/anabolic-cream-of-rice.jpeg",
  "LEVRONE anabolic cuts 30 sachets": "/products/supplements/anabolic-cuts.jpeg",
  "LEVRONE anabolic ice BCAA 375 icy mango-passion fruit": "/products/supplements/anabolic-ice-bcaaa.jpeg",
  "LEVRONE anabolic ice eaa 420 g icy orange-mango": "/products/supplements/anabolic-ice-eaa.jpeg",
  "LEVRONE anabolic leaa 240 g orange-mango": "/products/supplements/anabolic-leaa9.jpeg",
  "LEVRONE anabolic leaa 240 g sour watermelon": "/products/supplements/anabolic-leaa9.jpeg",
  "LEVRONE anabolic sleep Bombs 90 tabs": "/products/supplements/anabolic-sleep-bombs.jpeg",

  // ── LEVRONE GOLD ─────────────────────────────────────────────
  "LEVRONE levrone gold amino 350 tabs private label": "/products/supplements/gold-amino.jpeg",
  "LEVRONE levrone gold beef amino 600 tabs": "/products/supplements/gold-beef-amino.jpeg",
  "LEVRONE levrone gold creatine 1 kg": "/products/supplements/Gold Creatine.jpeg",
  "LEVRONE levrone gold creatine 300 g 2027": "/products/supplements/Gold Creatine.jpeg",
  "LEVRONE levrone gold creatine 300 g 2028": "/products/supplements/Gold Creatine.jpeg",
  "LEVRONE levrone gold creatine 500 g private label": "/products/supplements/Gold Creatine.jpeg",
  "LEVRONE levrone gold glutamine 300g": "/products/supplements/gold-glutamine.jpeg",
  "LEVRONE levrone gold iso 2 kg chocolate": "/products/supplements/gold-iso.jpeg",
  "LEVRONE levrone gold iso 2 kg snikers": "/products/supplements/gold-iso.jpeg",
  "LEVRONE levrone gold lean mass 3 kg chocolate": "/products/supplements/gold-lean-mass-2.jpeg",
  "LEVRONE levrone gold leen mass 6 kg chocolate": "/products/supplements/gold-lean-mass.jpeg",
  "LEVRONE levrone gold leen mass 6 kg snikers": "/products/supplements/gold-lean-mass.jpeg",
  "LEVRONE levrone gold leen mass 6 kg strawberry": "/products/supplements/gold-lean-mass.jpeg",
  "LEVRONE levrone gold lion's mane 1000 90 tabs": "/products/supplements/gold-lions-mane-1000.jpeg",
  "LEVRONE levrone gold pro zmax 90 tabs private label": "/products/supplements/gold-pro.jpeg",
  "LEVRONE levrone gold whey 2 kg chocolate": "/products/supplements/gold-whey.jpeg",
  "LEVRONE levrone gold whey 2 kg snikers": "/products/supplements/gold-whey.jpeg",

  // ── LEVRONE (levro-line) ─────────────────────────────────────
  "LEVRONE levrone bcaa 400 g blackberry-pineapple": "/products/supplements/levro-bcaa.jpeg",
  "LEVRONE levrone bcaa 400 g dragon fruit": "/products/supplements/levro-bcaa.jpeg",
  "LEVRONE levrone bcaa 400 g lychee": "/products/supplements/levro-bcaa.jpeg",
  "LEVRONE levrone bcaa 400 g orange-mango": "/products/supplements/levro-bcaa.jpeg",
  "LEVRONE levrone crea 240 g fruit massage": "/products/supplements/levro-crea.jpeg",
  "LEVRONE levrolegendary lipo burn 90 caps": "/products/supplements/levro-legendary-lipo-burn.jpeg",
  "LEVRONE levrone whey supreme 2 kg chocolate": "/products/supplements/levro-whey-supreme.jpeg",
  "LEVRONE levrone whey supreme 2 kg cookies & cream": "/products/supplements/levro-whey-supreme.jpeg",
  "LEVRONE levrone whey supreme 2 kg snikers": "/products/supplements/levro-whey-supreme.jpeg",
  "LEVRONE levrone whey supreme 2 kg strawberry-banana": "/products/supplements/levro-whey-supreme.jpeg",

  // ── LEVRONE shaaboom ─────────────────────────────────────────
  "LEVRONE shaaboom energy pump 320 ml fruit punch": "/products/supplements/shaaboom-pump.jpeg",
  "LEVRONE shaaboom energy pump 320 ml orange cherry": "/products/supplements/shaaboom-pump.jpeg",
  "LEVRONE shaaboom pump 385 g orange-mango": "/products/supplements/shaaboom-pump.jpeg",

  // ── BAD ASS ──────────────────────────────────────────────────
  "BAD ASS anabolic bcaa 8:1:1 400 g exotic": "/products/supplements/badass-bcaa-811.jpeg",
  "BAD ASS anabolic iso 2 kg vanilla jordan": "/products/supplements/nadass-anabolic-iso.jpeg",
  "BAD ASS pump 350 g citrus-peach": "/products/supplements/badass-pump.jpeg",
  "BAD ASS pump 350 g mango-lemon": "/products/supplements/badass-pump.jpeg",

  // ── Generic / single-name brands ─────────────────────────────
  "amino eaa xpload powder ice tea peach 520 g": "/products/supplements/amino-eaa-xplode-powder.jpeg",
  "amino eaa xpload powder pineapple 520 g": "/products/supplements/amino-eaa-xplode-powder.jpeg",
  "amino target xplode 275 g lemon": "/products/supplements/amino-target-xplode.jpeg",
  "creatine monohydrate powder 250 g": "/products/supplements/creatine-monohydrate-powder.jpeg",
  "gain bolic 6000 vanilla 6800 g": "/products/supplements/gain-bolic-6000.jpeg",
  "knockout 2.0": "/products/supplements/knockout-2-0-pre-workout.jpeg",
  "platinum ginseng sport edition 60 caps": "/products/supplements/platinum-gineseng-550.jpeg",
  "r-weiler focus cola 300g": "/products/supplements/r-weiler-focus.jpeg",
  "rocky athletes glutamine 250 g": "/products/supplements/rocky-athletes-glutamine.jpeg",

  // ── OLIMP Whey Protein Complex (shares the same pack design) ─
  "OLIMP Whey Protein Complex 100%-blbr-700g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-chc-700g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-ck-crm-700g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-dbl-chc-1800g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-dbl-chc-700g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-strwb-1800g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-strwb-700g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-vnl-1800g": "/products/supplements/whey-protein-complex.jpeg",
  "OLIMP Whey Protein Complex 100%-vnl-700g": "/products/supplements/whey-protein-complex.jpeg",
  "whey protein complex 100% blueberry 2270 g": "/products/supplements/whey-protein-complex.jpeg",
  "whey protein complex 100% cookies cream 2270 g": "/products/supplements/whey-protein-complex.jpeg",
  "whey protein complex 100% double chocolate 2270 g": "/products/supplements/whey-protein-complex.jpeg",
};

export function resolveProductImage(name: string): string | null {
  return PRODUCT_IMAGE_MAP[name] ?? null;
}
