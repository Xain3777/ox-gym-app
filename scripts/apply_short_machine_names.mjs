// Rewrite the `name` / `nameAr` field of each machine in
// src/data/machines.ts to the short form. Idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_FILE = join(process.cwd(), "src/data/machines.ts");

// Hand-curated short labels: { MODEL: [shortEn, shortAr] }
const SHORT = {
  "MND-X600C":  ["Treadmill",            "تريدميل"],
  "MND-X200B":  ["Stair Climber",        "صعود الدرج"],
  "MND-D12":    ["Bike",                 "دراجة"],
  "MND-X511B":  ["Elliptical",           "إليبتيكال"],
  "MND-D20":    ["Rower",                "تجديف"],
  "MND-Y600A":  ["Curved Treadmill",     "تريدميل منحني"],
  "MND-WG427":  ["Body Composition",     "تحليل الجسم"],
  "MND-FH01":   ["Prone Leg Curl",       "ثني ساق مستلقي"],
  "MND-FH02":   ["Leg Extension",        "تمديد الساق"],
  "MND-FH06":   ["Shoulder Press",       "ضغط كتف"],
  "MND-FH07":   ["Pec / Rear Delt Fly",  "فلاي صدر/خلفي"],
  "MND-FH08":   ["Vertical Press",       "ضغط عمودي"],
  "MND-FH09":   ["Assisted Dip / Chin",  "ديبس/عقلة بمساعدة"],
  "MND-FH10":   ["Split Chest Press",    "ضغط صدر منفصل"],
  "MND-FF17":   ["Functional Trainer",   "تدريب وظيفي"],
  "MND-FH19":   ["Abs",                  "بطن"],
  "MND-FH20":   ["Split Shoulder Press", "ضغط كتف منفصل"],
  "MND-FH23":   ["Seated Leg Curl",      "ثني ساق جالس"],
  "MND-FH24":   ["Glute",                "أرداف"],
  "MND-FH26":   ["Seated Dip",           "ديبس جالس"],
  "MND-FH28":   ["Tricep Extension",     "تمديد ترايسبس"],
  "MND-FH29":   ["Split High Row",       "سحب علوي منفصل"],
  "MND-FH34":   ["Seated Row",           "تجديف جالس"],
  "MND-FH35":   ["Lat Pulldown",         "سحب علوي"],
  "MND-FH86B":  ["Biceps / Triceps",     "بايسبس/ترايسبس"],
  "MND-FH88":   ["Chest / Shoulder Press", "ضغط صدر/كتف"],
  "MND-FH89B":  ["Pulldown / Long Row",  "سحب علوي/طويل"],
  "MND-F21":    ["Abductor",             "أبدكتور"],
  "MND-F22":    ["Adductor",             "أدكتور"],
  "MND-FF94":   ["Lateral Raise",        "رفع جانبي"],
  "MND-G05":    ["Chest Press",          "ضغط صدر"],
  "MND-G15":    ["Incline Press",        "ضغط مائل"],
  "MND-G20":    ["Pulldown",             "سحب"],
  "MND-G25":    ["Low Row",              "تجديف سفلي"],
  "MND-G30":    ["Incline Row",          "تجديف مائل"],
  "MND-G35":    ["Shoulder Press",       "ضغط كتف"],
  "MND-G40":    ["Glute Kickback",       "ركلة خلفية"],
  "MND-G45":    ["Calf",                 "سمانة"],
  "MND-G50":    ["Leg Press",            "ضغط ساق"],
  "MND-G65":    ["Biceps Curl",          "ثني بايسبس"],
  "MND-G70":    ["Standing Leg Curl",    "ثني ساق واقف"],
  "MND-SP38":   ["Vertical Leg Press",   "ضغط ساق عمودي"],
  "MND-FF49":   ["Dumbbell Rack",        "حامل دمبل"],
  "MND-SP42":   ["Pendulum Squat",       "سكوات بندولي"],
  "MND-SP06":   ["Pec Fly",              "فلاي صدر"],
  "MND-SP10":   ["Dual Dip Press",       "ديبس مزدوج"],
  "MND-LL619":  ["Belt Squat",           "سكوات حزام"],
  "MND-PL73B":  ["Hip Thrust",           "هيب ثرست"],
  "MND-PL32":   ["Abs Trainer",          "تمرين بطن"],
  "MND-PL62":   ["Calf Raise",           "رفع سمانة"],
  "MND-PL61":   ["T-Bar Row",            "تجديف رافعة"],
  "MND-FF55":   ["Barbell Rack",         "حامل بار"],
  "MND-F39":    ["Adjustable Bench",     "بنش متعدد"],
  "MND-F45":    ["Back Extension",       "تمديد ظهر"],
  "MND-F41":    ["Decline Bench",        "بنش منخفض"],
  "MND-F42":    ["Incline Bench",        "بنش مائل"],
  "MND-F43":    ["Flat Bench",           "بنش مسطح"],
};

let src = readFileSync(DATA_FILE, "utf-8");
let updated = 0;

src = src.replace(/\{[^{}]*?model:\s*"([^"]+)"[\s\S]*?\}/g, (block, model) => {
  const sh = SHORT[model];
  if (!sh) return block;
  const [en, ar] = sh;
  let next = block;
  next = next.replace(/(\bname:\s*)"[^"]*"/,   `$1"${en}"`);
  next = next.replace(/(\bnameAr:\s*)"[^"]*"/, `$1"${ar}"`);
  if (next !== block) updated++;
  return next;
});

writeFileSync(DATA_FILE, src);
console.log(`Updated short name + nameAr for ${updated} machines`);
