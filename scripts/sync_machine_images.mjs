// Move user-supplied machine images from /machines_images into
// /public/gym-machines (the path Next/Image serves), and update
// src/data/machines.ts so every machine entry whose name matches a
// filename gets its `image` field repointed.
//
// Usage:
//   node scripts/sync_machine_images.mjs

import { copyFileSync, readdirSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT       = process.cwd();
const SRC_DIR    = join(ROOT, "machines_images");
const DEST_DIR   = join(ROOT, "public", "gym-machines");
const DATA_FILE  = join(ROOT, "src/data/machines.ts");

if (!existsSync(SRC_DIR)) {
  console.error(`Missing source dir: ${SRC_DIR}`);
  process.exit(1);
}
mkdirSync(DEST_DIR, { recursive: true });

// ── Step 1: copy every image into /public/gym-machines ─────────
const sourceFiles = readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const renamedFromTo = new Map();   // original → cleaned (whitespace fix)

for (const f of sourceFiles) {
  const cleaned = f.replace(/\s+\./, ".").replace(/\s+(?=\.\w+$)/, "");
  copyFileSync(join(SRC_DIR, f), join(DEST_DIR, cleaned));
  if (cleaned !== f) renamedFromTo.set(f, cleaned);
}
console.log(`Copied ${sourceFiles.length} files → /public/gym-machines/`);
if (renamedFromTo.size) {
  console.log("  Trimmed whitespace in filenames:");
  for (const [from, to] of renamedFromTo) console.log(`    "${from}" → "${to}"`);
}

// ── Step 2: model → image filename mapping (hand-curated) ─────
// Only includes confident matches. For each machine NOT in this map,
// the existing `image` string is left alone (the loader will fall back
// to whatever was there before — possibly a 404 if the file doesn't
// exist; surface those at the end so the user can fix them).
const MAP = {
  // Cardio
  "MND-X600C":  "Treadmill.jpg",
  "MND-X200B":  "Stair Climber.jpg",
  "MND-X511B":  "Elliptical Trainer.jpg",
  "MND-D20":    "Rowing Machine.jpg",
  "MND-Y600A":  "Curved Treadmill.jpg",

  // Legs (selectorized)
  "MND-FH01":   "Prone Leg Curl.jpg",
  "MND-FH02":   "Leg Extension.jpg",
  "MND-FH24":   "Glute Isolator.jpg",

  // Shoulders
  "MND-FH06":   "Shoulder Press.jpg",
  "MND-FF94":   "Standing Lateral Raise.jpg",

  // Chest
  "MND-FH08":   "Vertical Press.jpg",
  "MND-FH10":   "Split Push Chest Trainer.jpg",
  "MND-G05":    "Chest Press.jpg",
  "MND-G15":    "Incline Chest Press (Plate Loaded).jpg",
  "MND-SP06":   "Super Middle Chest Flight.jpg",

  // Arms
  "MND-FH09":   "DipChin Assist.jpg",
  "MND-FH86B":  "BicepsTriceps.jpg",
  "MND-G65":    "Biceps.jpg",
  "MND-SP10":   "Dips Press Dual System.jpg",

  // Functional / Equipment
  "MND-FF17":   "Functional Trainer.jpg",
  "MND-FF49":   "Two Layer Dumbell Rack.jpg",

  // Core
  "MND-FH19":   "Abdominal Machine.jpg",

  // Back
  "MND-FH29":   "Split High Pull.jpg",
  "MND-FH34":   "Seated Row.jpg",
  "MND-FH35":   "Iso-Lateral Lat Pulldown.jpg",
  "MND-G20":    "Pull Down.jpg",
  "MND-PL61":   "Incline Lever Row.jpg",

  // Legs (more)
  "MND-F21":    "Abductor A.jpg",
  "MND-F22":    "Adductor B.jpg",
  "MND-G40":    "Rear Kick.jpg",
  "MND-G45":    "Calf.jpg",
  "MND-G50":    "Leg Press.jpg",
  "MND-G70":    "Standing Leg Curl.jpg",
  "MND-SP38":   "Super Vertical Leg Press.jpg",
  "MND-LL619":  "Rhino Squat-H.jpg",
  "MND-PL73B":  "Hip Thrust.jpg",

  // Benches
  "MND-F41":    "Professional Decline Bench.jpg",
  "MND-F42":    "Bench Incline.jpg",
};

// ── Step 3: rewrite the `image` field for each matched machine ────
const dataSrc = readFileSync(DATA_FILE, "utf-8");
let updated = dataSrc;
let updatedCount = 0;

// Block-by-block: locate each machine block, find its model, then
// replace its image: line if a mapping exists.
const blockRe = /\{[^{}]*?model:\s*"([^"]+)"[\s\S]*?\}/g;
updated = updated.replace(blockRe, (block, model) => {
  if (!MAP[model]) return block;
  const newPath = `/gym-machines/${MAP[model]}`;
  const replaced = block.replace(/image:\s*"[^"]*"/, `image: "${newPath}"`);
  if (replaced !== block) updatedCount++;
  return replaced;
});

if (updatedCount === 0) {
  console.warn("No image: lines were rewritten — pattern mismatch?");
} else {
  writeFileSync(DATA_FILE, updated);
  console.log(`Updated image paths for ${updatedCount} machines in src/data/machines.ts`);
}

// ── Step 4: report machines without an image match ────────────
const allModels = [...dataSrc.matchAll(/model:\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => s.startsWith("MND-"));
const missing = allModels.filter((m) => !MAP[m]);
console.log(`\nMachines with NO image mapping (${missing.length}/${allModels.length}):`);
for (const m of missing) console.log(`  ${m}`);

// And images that didn't get used
const usedFiles = new Set(Object.values(MAP));
const unusedFiles = sourceFiles
  .map((f) => f.replace(/\s+\./, ".").replace(/\s+(?=\.\w+$)/, ""))
  .filter((f) => !usedFiles.has(f) && !/^photo_/.test(f));
console.log(`\nImages copied but not assigned to any machine (${unusedFiles.length}):`);
for (const f of unusedFiles) console.log(`  ${f}`);
