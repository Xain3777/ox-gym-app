// Builds two Excel workbooks from the TS data files:
//   - Machines.xlsx     (model, muscle group, full + short EN/AR names)
//   - StoreItems.xlsx   (category, name, sub-category, price, description)
//
// Run from the repo root:
//   node scripts/export_machines_and_store.mjs

import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const ROOT = process.cwd();

// ── Helpers ────────────────────────────────────────────────────
const read = (p) => readFileSync(`${ROOT}/${p}`, "utf-8");

/** Parse all top-level object literals out of a `.ts` data file. */
function parseObjects(src) {
  // Pull each `{ … }` block at indentation level 2 (entries of the array).
  const blocks = [];
  let depth = 0, start = -1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) { blocks.push(src.slice(start + 1, i)); start = -1; }
    }
  }
  // Filter to blocks that look like records (have a `:` and a comma)
  return blocks.filter((b) => b.includes(":") && b.includes(","));
}

function extractField(block, field) {
  const re = new RegExp(`\\b${field}\\s*:\\s*("([^"]*)"|(-?\\d+(?:\\.\\d+)?))`);
  const m = re.exec(block);
  if (!m) return undefined;
  return m[2] ?? Number(m[3]);
}

// ── Machines ───────────────────────────────────────────────────
const machinesSrc = read("src/data/machines.ts");
const machineBlocks = parseObjects(machinesSrc).filter((b) => extractField(b, "model"));

// Index full info by model
const fullByModel = new Map();
for (const b of machineBlocks) {
  const model = extractField(b, "model");
  if (!model) continue;
  fullByModel.set(model, {
    model,
    muscleGroup: extractField(b, "muscleGroup"),
    nameEn:      extractField(b, "name"),
    nameAr:      extractField(b, "nameAr"),
  });
}

// Parse the short names from MACHINES_SHORT.txt (lines like "MND-X600C — Treadmill — تريدميل")
const shortByModel = new Map();
for (const line of read("MACHINES_SHORT.txt").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const parts = trimmed.split(/\s+—\s+/);
  if (parts.length < 3) continue;
  const [model, shortEn, shortAr] = parts.map((s) => s.trim());
  shortByModel.set(model, { shortEn, shortAr });
}

const machineRows = [...fullByModel.values()].map((m) => {
  const s = shortByModel.get(m.model) ?? { shortEn: "", shortAr: "" };
  return {
    Model:               m.model,
    "Muscle Group":      m.muscleGroup,
    "Name (EN, full)":   m.nameEn,
    "Name (AR, full)":   m.nameAr,
    "Short EN":          s.shortEn,
    "Short AR":          s.shortAr,
  };
});

const machinesWb = XLSX.utils.book_new();
const machinesWs = XLSX.utils.json_to_sheet(machineRows);
machinesWs["!cols"] = [
  { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 32 }, { wch: 24 }, { wch: 22 },
];
XLSX.utils.book_append_sheet(machinesWb, machinesWs, "Machines");
XLSX.writeFile(machinesWb, `${ROOT}/Machines.xlsx`);
console.log(`Machines.xlsx — ${machineRows.length} rows`);

// ── Store items ────────────────────────────────────────────────
const STORE_FILES = [
  { file: "src/data/products/supplements.ts",   category: "Supplements" },
  { file: "src/data/products/our-products.ts",  category: "Our Store"   },
  { file: "src/data/products/wearables.ts",     category: "Wearables"   },
];

const storeRows = [];
for (const { file, category } of STORE_FILES) {
  for (const block of parseObjects(read(file))) {
    const name = extractField(block, "name");
    if (!name) continue;
    storeRows.push({
      Category:        category,
      Name:            name,
      "Sub-category":  extractField(block, "subCategory") ?? "",
      Price:           extractField(block, "price") ?? "",
      Badge:           extractField(block, "badge")       ?? "",
      Description:     extractField(block, "desc")        ?? "",
    });
  }
}

const storeWb = XLSX.utils.book_new();
const storeWs = XLSX.utils.json_to_sheet(storeRows);
storeWs["!cols"] = [
  { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 60 },
];
XLSX.utils.book_append_sheet(storeWb, storeWs, "Store Items");
XLSX.writeFile(storeWb, `${ROOT}/StoreItems.xlsx`);
console.log(`StoreItems.xlsx — ${storeRows.length} rows`);
