// ── GYM MACHINE DATA ─────────────────────────────────────────
// Extracted from Shandong Minolta invoice PDF (MND20251025ZH01)
// Images stored in /public/gym-machines/

export type MuscleGroup =
  | "Cardio"
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Arms"
  | "Core"
  | "Equipment";

export interface Machine {
  id: string;
  model: string;
  name: string;
  nameAr: string;
  slug: string;
  image: string;
  /** YouTube video ID for demo playback (e.g. "dQw4w9WgXcQ") */
  demo?: string;
  muscleGroup: MuscleGroup;
  description: string;
  descriptionAr: string;
}

export const MACHINES: Machine[] = [
  // ── CARDIO ──────────────────────────────────────────────────
  {
    id: "1",
    model: "MND-X600C",
    name: "Commercial Treadmill",
    nameAr: "جهاز جري احترافي",
    slug: "MND-X600C-commercial-treadmill",
    image: "/gym-machines/Treadmill.jpg",
    muscleGroup: "Cardio",
    description: "3HP motor with LED screen. Walk, jog, or sprint with adjustable speed and incline for effective cardio training.",
    descriptionAr: "محرك ٣ حصان مع شاشة LED. امشِ أو اركض مع سرعة وانحدار قابل للتعديل.",
  },
  {
    id: "2",
    model: "MND-X200B",
    name: "Stair Trainer",
    nameAr: "جهاز صعود الدرج",
    slug: "MND-X200B-stair-trainer",
    image: "/gym-machines/Stair Climber.jpg",
    muscleGroup: "Cardio",
    description: "Simulates climbing stairs for an intense lower-body cardio burn. Builds endurance and tones glutes and calves.",
    descriptionAr: "يحاكي صعود الدرج لتمرين كارديو مكثف. يبني التحمل ويشد الأرداف والسمانة.",
  },
  {
    id: "3",
    model: "MND-D12",
    name: "Exercise Bike",
    nameAr: "دراجة رياضية",
    slug: "MND-D12-exercise-bike",
    image: "/gym-machines/MND-D12-exercise-bike.jpg",
    muscleGroup: "Cardio",
    description: "Low-impact stationary cycling for cardio endurance. Adjustable resistance for all fitness levels.",
    descriptionAr: "دراجة ثابتة منخفضة التأثير لتمارين الكارديو. مقاومة قابلة للتعديل لجميع المستويات.",
  },
  {
    id: "4",
    model: "MND-X511B",
    name: "Commercial Elliptical",
    nameAr: "جهاز إليبتيكال احترافي",
    slug: "MND-X511B-commercial-elliptical",
    image: "/gym-machines/Elliptical Trainer.jpg",
    muscleGroup: "Cardio",
    description: "Full-body, low-impact cardio with LCD screen. Engages arms and legs simultaneously.",
    descriptionAr: "كارديو كامل الجسم منخفض التأثير مع شاشة LCD. يعمل على الذراعين والساقين معاً.",
  },
  {
    id: "5",
    model: "MND-D20",
    name: "Rowing Machine",
    nameAr: "جهاز تجديف",
    slug: "MND-D20-rowing-machine",
    image: "/gym-machines/Rowing Machine.jpg",
    muscleGroup: "Cardio",
    description: "2-in-1 rowing machine for full-body cardio and strength. Works back, arms, and legs in every stroke.",
    descriptionAr: "جهاز تجديف ٢ في ١ لتمرين كامل الجسم. يعمل على الظهر والذراعين والساقين.",
  },
  {
    id: "6",
    model: "MND-Y600A",
    name: "Curved Treadmill",
    nameAr: "جهاز جري منحني",
    slug: "MND-Y600A-curved-treadmill",
    image: "/gym-machines/Curved Treadmill.jpg",
    muscleGroup: "Cardio",
    description: "Self-powered curved belt treadmill. No motor needed — your effort drives the speed for natural running mechanics.",
    descriptionAr: "جهاز جري منحني ذاتي الطاقة. لا يحتاج محرك — جهدك يحدد السرعة.",
  },

  // ── ANALYSIS ────────────────────────────────────────────────
  {
    id: "7",
    model: "MND-WG427",
    name: "Body Analysis Machine",
    nameAr: "جهاز تحليل الجسم",
    slug: "MND-WG427-body-analysis-machine",
    image: "/gym-machines/MND-WG427-body-analysis-machine.jpg",
    muscleGroup: "Equipment",
    description: "Measures body composition including muscle mass, fat percentage, and BMI for tracking progress.",
    descriptionAr: "يقيس تكوين الجسم بما في ذلك الكتلة العضلية ونسبة الدهون ومؤشر كتلة الجسم.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "8",
    model: "MND-FH01",
    name: "Prone Leg Curl",
    nameAr: "ثني الساق (مستلقي)",
    slug: "MND-FH01-prone-leg-curl",
    image: "/gym-machines/Prone Leg Curl.jpg",
    muscleGroup: "Legs",
    description: "Isolates the hamstrings while lying face-down. 100KG weight stack for progressive overload.",
    descriptionAr: "يعزل عضلات الفخذ الخلفية أثناء الاستلقاء. مكدس أوزان ١٠٠ كجم.",
  },
  {
    id: "9",
    model: "MND-FH02",
    name: "Leg Extension",
    nameAr: "تمديد الساق",
    slug: "MND-FH02-leg-extension",
    image: "/gym-machines/Leg Extension.jpg",
    muscleGroup: "Legs",
    description: "Targets the quadriceps with isolated knee extension. Adjustable pad and 100KG stack.",
    descriptionAr: "يستهدف عضلات الفخذ الأمامية بتمديد الركبة المعزول. مكدس ١٠٠ كجم.",
  },

  // ── SHOULDERS ───────────────────────────────────────────────
  {
    id: "10",
    model: "MND-FH06",
    name: "Shoulder Press",
    nameAr: "ضغط الكتف",
    slug: "MND-FH06-shoulder-press",
    image: "/gym-machines/Shoulder Press.jpg",
    muscleGroup: "Shoulders",
    description: "Overhead pressing machine targeting deltoids and triceps. Guided path for safe, heavy pressing.",
    descriptionAr: "جهاز ضغط علوي يستهدف الأكتاف والترايسبس. مسار موجه للضغط الآمن.",
  },

  // ── CHEST ───────────────────────────────────────────────────
  {
    id: "11",
    model: "MND-FH07",
    name: "Rear Delt / Pec Fly",
    nameAr: "فلاي خلفي / صدر",
    slug: "MND-FH07-rear-delt-pec-fly",
    image: "/gym-machines/MND-FH07-rear-delt-pec-fly.jpg",
    muscleGroup: "Chest",
    description: "Dual-function machine for chest flyes and rear deltoid work. Switch positions to target both muscle groups.",
    descriptionAr: "جهاز مزدوج لتمارين الصدر والكتف الخلفي. غيّر الوضعية لاستهداف كلتا المجموعتين.",
  },
  {
    id: "12",
    model: "MND-FH08",
    name: "Vertical Press",
    nameAr: "ضغط عمودي",
    slug: "MND-FH08-vertical-press",
    image: "/gym-machines/Vertical Press.jpg",
    muscleGroup: "Chest",
    description: "Vertical chest press with 100KG stack. Targets upper chest, shoulders, and triceps.",
    descriptionAr: "ضغط صدر عمودي بمكدس ١٠٠ كجم. يستهدف الصدر العلوي والأكتاف والترايسبس.",
  },

  // ── ARMS ─────────────────────────────────────────────────────
  {
    id: "13",
    model: "MND-FH09",
    name: "Dip / Chin Assist",
    nameAr: "مساعد تمرين العقلة والديبس",
    slug: "MND-FH09-dip-chin-assist",
    image: "/gym-machines/DipChin Assist.jpg",
    muscleGroup: "Arms",
    description: "Assisted dips and chin-ups with counterweight. Perfect for building upper-body pull and push strength.",
    descriptionAr: "تمارين ديبس وعقلة مع ثقل موازن. مثالي لبناء قوة الدفع والسحب.",
  },

  // ── CHEST ───────────────────────────────────────────────────
  {
    id: "14",
    model: "MND-FH10",
    name: "Split Push Chest Trainer",
    nameAr: "جهاز ضغط الصدر المنفصل",
    slug: "MND-FH10-split-push-chest-trainer",
    image: "/gym-machines/Split Push Chest Trainer.jpg",
    muscleGroup: "Chest",
    description: "Independent arm chest press for balanced development. Eliminates strength imbalances between sides.",
    descriptionAr: "ضغط صدر بذراعين منفصلين لتطوير متوازن. يزيل اختلاف القوة بين الجانبين.",
  },
  {
    id: "15",
    model: "MND-FF17",
    name: "Functional Trainer",
    nameAr: "جهاز تدريب وظيفي",
    slug: "MND-FF17-functional-trainer",
    image: "/gym-machines/Functional Trainer.jpg",
    muscleGroup: "Equipment",
    description: "Dual adjustable cable system for hundreds of exercises. Versatile full-body training station.",
    descriptionAr: "نظام كيبل مزدوج قابل للتعديل لمئات التمارين. محطة تدريب شاملة.",
  },

  // ── CORE ─────────────────────────────────────────────────────
  {
    id: "16",
    model: "MND-FH19",
    name: "Abdominal Machine",
    nameAr: "جهاز البطن",
    slug: "MND-FH19-abdominal-machine",
    image: "/gym-machines/Abdominal Machine.jpg",
    muscleGroup: "Core",
    description: "Weighted abdominal crunch machine with 70KG stack. Adds progressive resistance to core training.",
    descriptionAr: "جهاز بطن بأوزان ومكدس ٧٠ كجم. يضيف مقاومة تدريجية لتمارين البطن.",
  },

  // ── SHOULDERS ───────────────────────────────────────────────
  {
    id: "17",
    model: "MND-FH20",
    name: "Split Shoulder Lifting Trainer",
    nameAr: "جهاز رفع الكتف المنفصل",
    slug: "MND-FH20-split-shoulder-lifting-trainer",
    image: "/gym-machines/MND-FH20-split-shoulder-lifting-trainer.jpg",
    muscleGroup: "Shoulders",
    description: "Independent arm shoulder press for symmetrical deltoid development. 100KG weight stack.",
    descriptionAr: "ضغط كتف بذراعين منفصلين لتطوير متماثل للأكتاف. مكدس ١٠٠ كجم.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "18",
    model: "MND-FH23",
    name: "Seated Leg Curl",
    nameAr: "ثني الساق (جالس)",
    slug: "MND-FH23-seated-leg-curl",
    image: "/gym-machines/MND-FH23-seated-leg-curl.jpg",
    muscleGroup: "Legs",
    description: "Seated hamstring curl with 70KG stack. Isolates the hamstrings from a seated position.",
    descriptionAr: "ثني ساق جالس بمكدس ٧٠ كجم. يعزل عضلات الفخذ الخلفية.",
  },
  {
    id: "19",
    model: "MND-FH24",
    name: "Glute Isolator",
    nameAr: "جهاز عزل الأرداف",
    slug: "MND-FH24-glute-isolator",
    image: "/gym-machines/Glute Isolator.jpg",
    muscleGroup: "Legs",
    description: "Isolates the gluteus muscles for targeted hip extension. 70KG stack for progressive loading.",
    descriptionAr: "يعزل عضلات الأرداف لتمديد الورك المستهدف. مكدس ٧٠ كجم.",
  },
  {
    id: "20",
    model: "MND-FH26",
    name: "Seated Dip",
    nameAr: "ديبس جالس",
    slug: "MND-FH26-seated-dip",
    image: "/gym-machines/MND-FH26-seated-dip.jpg",
    muscleGroup: "Arms",
    description: "Machine-assisted dip movement targeting triceps and lower chest. 85KG stack.",
    descriptionAr: "حركة ديبس بمساعدة الجهاز تستهدف الترايسبس والصدر السفلي. مكدس ٨٥ كجم.",
  },
  {
    id: "21",
    model: "MND-FH28",
    name: "Tricep Extension",
    nameAr: "تمديد الترايسبس",
    slug: "MND-FH28-tricep-extension",
    image: "/gym-machines/MND-FH28-tricep-extension.jpg",
    muscleGroup: "Arms",
    description: "Overhead tricep extension with 70KG stack. Isolates all three heads of the triceps.",
    descriptionAr: "تمديد ترايسبس علوي بمكدس ٧٠ كجم. يعزل رؤوس الترايسبس الثلاثة.",
  },

  // ── BACK ─────────────────────────────────────────────────────
  {
    id: "22",
    model: "MND-FH29",
    name: "Split High Pull Trainer",
    nameAr: "جهاز سحب علوي منفصل",
    slug: "MND-FH29-split-high-pull-trainer",
    image: "/gym-machines/Split High Pull.jpg",
    muscleGroup: "Back",
    description: "Independent arm high pull for balanced back development. 100KG stack.",
    descriptionAr: "سحب علوي بذراعين منفصلين لتطوير ظهر متوازن. مكدس ١٠٠ كجم.",
  },
  {
    id: "23",
    model: "MND-FH34",
    name: "Seated Row",
    nameAr: "تجديف جالس",
    slug: "MND-FH34-seated-row",
    image: "/gym-machines/Seated Row.jpg",
    muscleGroup: "Back",
    description: "Seated rowing machine for building back thickness. Targets rhomboids and lats. 100KG stack.",
    descriptionAr: "جهاز تجديف جالس لبناء سماكة الظهر. يستهدف عضلات الظهر الوسطى. مكدس ١٠٠ كجم.",
  },
  {
    id: "24",
    model: "MND-FH35",
    name: "Pulldown",
    nameAr: "سحب علوي",
    slug: "MND-FH35-pulldown",
    image: "/gym-machines/Iso-Lateral Lat Pulldown.jpg",
    muscleGroup: "Back",
    description: "Lat pulldown with 100KG stack. Builds back width by targeting the latissimus dorsi.",
    descriptionAr: "سحب علوي بمكدس ١٠٠ كجم. يبني عرض الظهر باستهداف العضلة الظهرية العريضة.",
  },

  // ── ARMS ─────────────────────────────────────────────────────
  {
    id: "25",
    model: "MND-FH86B",
    name: "Biceps / Triceps",
    nameAr: "بايسبس / ترايسبس",
    slug: "MND-FH86B-biceps-triceps",
    image: "/gym-machines/BicepsTriceps.jpg",
    muscleGroup: "Arms",
    description: "Dual-function machine for bicep curls and tricep extensions. 70KG stack.",
    descriptionAr: "جهاز مزدوج لتمارين البايسبس والترايسبس. مكدس ٧٠ كجم.",
  },

  // ── CHEST / SHOULDERS ──────────────────────────────────────
  {
    id: "26",
    model: "MND-FH88",
    name: "Chest / Shoulder Press",
    nameAr: "ضغط صدر / كتف",
    slug: "MND-FH88-chest-shoulder-press",
    image: "/gym-machines/MND-FH88-chest-shoulder-press.jpg",
    muscleGroup: "Chest",
    description: "Combined chest and shoulder press machine. Adjustable angles for targeting both muscle groups.",
    descriptionAr: "جهاز ضغط صدر وكتف مدمج. زوايا قابلة للتعديل لاستهداف المجموعتين.",
  },

  // ── BACK ─────────────────────────────────────────────────────
  {
    id: "27",
    model: "MND-FH89B",
    name: "Pulldown / Long Pull",
    nameAr: "سحب علوي / سحب طويل",
    slug: "MND-FH89B-pulldown-long-pull",
    image: "/gym-machines/MND-FH89B-pulldown-long-pull.jpg",
    muscleGroup: "Back",
    description: "Dual station for lat pulldowns and long pull rows. 70KG stack, two exercises in one machine.",
    descriptionAr: "محطة مزدوجة للسحب العلوي والتجديف الطويل. مكدس ٧٠ كجم، تمرينان في جهاز واحد.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "28",
    model: "MND-F21",
    name: "Abductor",
    nameAr: "جهاز الفتح (أبدكتور)",
    slug: "MND-F21-abductor",
    image: "/gym-machines/Abductor A.jpg",
    muscleGroup: "Legs",
    description: "Outer thigh machine that strengthens hip abductors. 70KG stack.",
    descriptionAr: "جهاز الفخذ الخارجي يقوي عضلات فتح الورك. مكدس ٧٠ كجم.",
  },
  {
    id: "29",
    model: "MND-F22",
    name: "Adductor",
    nameAr: "جهاز الضم (أدكتور)",
    slug: "MND-F22-adductor",
    image: "/gym-machines/Adductor B.jpg",
    muscleGroup: "Legs",
    description: "Inner thigh machine that strengthens hip adductors. 70KG stack.",
    descriptionAr: "جهاز الفخذ الداخلي يقوي عضلات ضم الورك. مكدس ٧٠ كجم.",
  },

  // ── SHOULDERS ───────────────────────────────────────────────
  {
    id: "30",
    model: "MND-FF94",
    name: "Standing Lateral Raise",
    nameAr: "رفع جانبي واقف",
    slug: "MND-FF94-standing-lateral-raise",
    image: "/gym-machines/Standing Lateral Raise.jpg",
    muscleGroup: "Shoulders",
    description: "Machine lateral raise for medial deltoid isolation. 100KG stack for heavy loading.",
    descriptionAr: "رفع جانبي بالجهاز لعزل الكتف الأوسط. مكدس ١٠٠ كجم.",
  },

  // ── CHEST ───────────────────────────────────────────────────
  {
    id: "31",
    model: "MND-G05",
    name: "Chest Press",
    nameAr: "ضغط الصدر",
    slug: "MND-G05-chest-press",
    image: "/gym-machines/Chest Press.jpg",
    muscleGroup: "Chest",
    description: "Plate-loaded chest press for heavy compound pushing. Targets pectorals, deltoids, and triceps.",
    descriptionAr: "ضغط صدر بالأقراص للدفع المركب الثقيل. يستهدف الصدر والأكتاف والترايسبس.",
  },
  {
    id: "32",
    model: "MND-G15",
    name: "Incline Chest Press",
    nameAr: "ضغط صدر مائل",
    slug: "MND-G15-incline-chest-press",
    image: "/gym-machines/Incline Chest Press (Plate Loaded).jpg",
    muscleGroup: "Chest",
    description: "Plate-loaded incline press for upper chest emphasis. Angled pressing path targets clavicular pectorals.",
    descriptionAr: "ضغط مائل بالأقراص للتركيز على الصدر العلوي.",
  },

  // ── BACK ─────────────────────────────────────────────────────
  {
    id: "33",
    model: "MND-G20",
    name: "Pull Down",
    nameAr: "سحب للأسفل",
    slug: "MND-G20-pull-down",
    image: "/gym-machines/Pull Down.jpg",
    muscleGroup: "Back",
    description: "Plate-loaded pulldown for building back width. Targets lats and biceps.",
    descriptionAr: "سحب للأسفل بالأقراص لبناء عرض الظهر. يستهدف العضلة الظهرية والبايسبس.",
  },
  {
    id: "34",
    model: "MND-G25",
    name: "Low Row",
    nameAr: "تجديف سفلي",
    slug: "MND-G25-low-row",
    image: "/gym-machines/MND-G25-low-row.jpg",
    muscleGroup: "Back",
    description: "Plate-loaded low row for back thickness. Targets middle and lower traps, rhomboids.",
    descriptionAr: "تجديف سفلي بالأقراص لسماكة الظهر. يستهدف شبه المنحرف والمعينية.",
  },
  {
    id: "35",
    model: "MND-G30",
    name: "Incline Level Row",
    nameAr: "تجديف مائل",
    slug: "MND-G30-incline-level-row",
    image: "/gym-machines/MND-G30-incline-level-row.jpg",
    muscleGroup: "Back",
    description: "Plate-loaded incline row with chest support. Isolates back muscles while reducing lower-back strain.",
    descriptionAr: "تجديف مائل بالأقراص مع دعم للصدر. يعزل عضلات الظهر مع تقليل الضغط.",
  },

  // ── SHOULDERS ───────────────────────────────────────────────
  {
    id: "36",
    model: "MND-G35",
    name: "Shoulder Press",
    nameAr: "ضغط الكتف",
    slug: "MND-G35-shoulder-press",
    image: "/gym-machines/MND-G35-shoulder-press.jpg",
    muscleGroup: "Shoulders",
    description: "Plate-loaded overhead shoulder press. Natural pressing arc for safe deltoid development.",
    descriptionAr: "ضغط كتف علوي بالأقراص. قوس ضغط طبيعي لتطوير آمن للأكتاف.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "37",
    model: "MND-G40",
    name: "Rear Kick",
    nameAr: "ركلة خلفية",
    slug: "MND-G40-rear-kick",
    image: "/gym-machines/Rear Kick.jpg",
    muscleGroup: "Legs",
    description: "Plate-loaded glute kickback machine. Isolates the glutes with hip extension movement.",
    descriptionAr: "جهاز ركلة خلفية بالأقراص. يعزل الأرداف بحركة تمديد الورك.",
  },
  {
    id: "38",
    model: "MND-G45",
    name: "Calf Machine",
    nameAr: "جهاز السمانة",
    slug: "MND-G45-calf",
    image: "/gym-machines/Calf.jpg",
    muscleGroup: "Legs",
    description: "Plate-loaded standing calf raise. Builds gastrocnemius and soleus muscles.",
    descriptionAr: "رفع سمانة واقف بالأقراص. يبني عضلات السمانة.",
  },
  {
    id: "39",
    model: "MND-G50",
    name: "Leg Press",
    nameAr: "ضغط الساق",
    slug: "MND-G50-leg-press",
    image: "/gym-machines/Leg Press.jpg",
    muscleGroup: "Legs",
    description: "Plate-loaded leg press for heavy lower-body training. Targets quads, glutes, and hamstrings.",
    descriptionAr: "ضغط ساق بالأقراص للتدريب الثقيل. يستهدف الفخذ والأرداف.",
  },

  // ── ARMS ─────────────────────────────────────────────────────
  {
    id: "40",
    model: "MND-G65",
    name: "Biceps Curl",
    nameAr: "ثني البايسبس",
    slug: "MND-G65-biceps",
    image: "/gym-machines/Biceps.jpg",
    muscleGroup: "Arms",
    description: "Plate-loaded preacher curl for bicep isolation. Strict form prevents cheating.",
    descriptionAr: "ثني بايسبس بالأقراص لعزل العضلة. شكل صارم يمنع الغش.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "41",
    model: "MND-G70",
    name: "Standing Leg Curl",
    nameAr: "ثني الساق واقف",
    slug: "MND-G70-standing-leg-curl",
    image: "/gym-machines/Standing Leg Curl.jpg",
    muscleGroup: "Legs",
    description: "Plate-loaded standing hamstring curl. Unilateral training for balanced development.",
    descriptionAr: "ثني ساق واقف بالأقراص. تدريب أحادي لتطوير متوازن.",
  },
  {
    id: "42",
    model: "MND-SP38",
    name: "Super Vertical Leg Press",
    nameAr: "ضغط ساق عمودي فائق",
    slug: "MND-SP38-super-vertical-leg-press",
    image: "/gym-machines/Super Vertical Leg Press.jpg",
    muscleGroup: "Legs",
    description: "Vertical leg press for maximum quad activation. Unique angle for deep muscle engagement.",
    descriptionAr: "ضغط ساق عمودي لأقصى تفعيل للفخذ. زاوية فريدة لتفعيل عضلي عميق.",
  },

  // ── EQUIPMENT ───────────────────────────────────────────────
  {
    id: "43",
    model: "MND-FF49",
    name: "Dumbbell Rack",
    nameAr: "حامل الدمبل",
    slug: "MND-FF49-dumbbell-rack",
    image: "/gym-machines/Two Layer Dumbell Rack.jpg",
    muscleGroup: "Equipment",
    description: "Two-layer dumbbell storage rack. Keeps the gym organized and weights easily accessible.",
    descriptionAr: "حامل دمبل من طابقين. يحافظ على تنظيم الجيم وسهولة الوصول للأوزان.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "44",
    model: "MND-SP42",
    name: "Super Pendulum Squat",
    nameAr: "سكوات بندول فائق",
    slug: "MND-SP42-super-pendulum-squat",
    image: "/gym-machines/MND-SP42-super-pendulum-squat.jpg",
    muscleGroup: "Legs",
    description: "Pendulum squat machine for deep quad engagement. Unique arc motion reduces joint stress.",
    descriptionAr: "جهاز سكوات بندولي لتفعيل عميق للفخذ. حركة قوسية تقلل ضغط المفاصل.",
  },

  // ── CHEST ───────────────────────────────────────────────────
  {
    id: "45",
    model: "MND-SP06",
    name: "Super Chest Fly",
    nameAr: "فلاي صدر فائق",
    slug: "MND-SP06-super-chest-fly",
    image: "/gym-machines/Super Middle Chest Flight.jpg",
    muscleGroup: "Chest",
    description: "Premium chest fly machine for deep pectoral isolation. Wide arc of motion for full stretch.",
    descriptionAr: "جهاز فلاي صدر فاخر لعزل عضلات الصدر. قوس حركة واسع للتمدد الكامل.",
  },

  // ── ARMS ─────────────────────────────────────────────────────
  {
    id: "46",
    model: "MND-SP10",
    name: "Dips Press Dual System",
    nameAr: "نظام ديبس مزدوج",
    slug: "MND-SP10-dips-press-dual",
    image: "/gym-machines/Dips Press Dual System.jpg",
    muscleGroup: "Arms",
    description: "Dual-function dip and press station. Targets triceps, chest, and shoulders.",
    descriptionAr: "محطة ديبس وضغط مزدوجة. تستهدف الترايسبس والصدر والأكتاف.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "47",
    model: "MND-LL619",
    name: "Rhino Squat",
    nameAr: "سكوات رينو",
    slug: "MND-LL619-rhino-squat",
    image: "/gym-machines/Rhino Squat-H.jpg",
    muscleGroup: "Legs",
    description: "Belt squat alternative that loads the hips, not the spine. Great for heavy squatting with back issues.",
    descriptionAr: "بديل سكوات الحزام يحمل الوركين لا العمود الفقري. ممتاز للسكوات الثقيل.",
  },
  {
    id: "48",
    model: "MND-PL73B",
    name: "Hip Thrust Machine",
    nameAr: "جهاز هيب ثرست",
    slug: "MND-PL73B-hip-thrust-machine",
    image: "/gym-machines/Hip Thrust.jpg",
    muscleGroup: "Legs",
    description: "Dedicated hip thrust machine for glute development. Pad-loaded for comfortable heavy sets.",
    descriptionAr: "جهاز هيب ثرست مخصص لتطوير الأرداف. محمل بالوسادة للمجموعات الثقيلة.",
  },

  // ── CORE ─────────────────────────────────────────────────────
  {
    id: "49",
    model: "MND-PL32",
    name: "Abdominal Trainer",
    nameAr: "جهاز تمرين البطن",
    slug: "MND-PL32-abdominal-trainer",
    image: "/gym-machines/MND-PL32-abdominal-trainer.jpg",
    muscleGroup: "Core",
    description: "Compact ab trainer for weighted crunches. Adjustable resistance for progressive overload.",
    descriptionAr: "جهاز بطن مدمج للتمارين بالأوزان. مقاومة قابلة للتعديل.",
  },

  // ── LEGS ─────────────────────────────────────────────────────
  {
    id: "50",
    model: "MND-PL62",
    name: "Calf Raise",
    nameAr: "رفع السمانة",
    slug: "MND-PL62-calf-raise",
    image: "/gym-machines/MND-PL62-calf-raise.jpg",
    muscleGroup: "Legs",
    description: "Plate-loaded calf raise for lower leg development. Standing position for full range of motion.",
    descriptionAr: "رفع سمانة بالأقراص لتطوير الساق السفلية. وضع واقف لنطاق حركة كامل.",
  },

  // ── BACK ─────────────────────────────────────────────────────
  {
    id: "51",
    model: "MND-PL61",
    name: "Incline Lever Row",
    nameAr: "تجديف رافعة مائل",
    slug: "MND-PL61-incline-lever-row",
    image: "/gym-machines/Incline Lever Row.jpg",
    muscleGroup: "Back",
    description: "Plate-loaded T-bar style row with chest support. Isolates the back with reduced lower-back stress.",
    descriptionAr: "تجديف بالأقراص مع دعم للصدر. يعزل الظهر مع تقليل ضغط أسفل الظهر.",
  },

  // ── EQUIPMENT ───────────────────────────────────────────────
  {
    id: "52",
    model: "MND-FF55",
    name: "Barbell Rack",
    nameAr: "حامل البار",
    slug: "MND-FF55-barbell-rack",
    image: "/gym-machines/MND-FF55-barbell-rack.jpg",
    muscleGroup: "Equipment",
    description: "Vertical barbell storage rack. Keeps bars organized and easily accessible.",
    descriptionAr: "حامل بار عمودي. يحافظ على تنظيم الأوزان وسهولة الوصول.",
  },
  {
    id: "53",
    model: "MND-F39",
    name: "Super Bench",
    nameAr: "بنش متعدد",
    slug: "MND-F39-super-bench",
    image: "/gym-machines/MND-F39-super-bench.jpg",
    muscleGroup: "Equipment",
    description: "Adjustable multi-angle bench for dumbbell and barbell exercises. Flat, incline, and decline positions.",
    descriptionAr: "بنش متعدد الزوايا للتمارين بالدمبل والبار. أوضاع مسطح ومائل ومنخفض.",
  },

  // ── CORE ─────────────────────────────────────────────────────
  {
    id: "54",
    model: "MND-F45",
    name: "Back Extension",
    nameAr: "تمديد الظهر",
    slug: "MND-F45-back-extension",
    image: "/gym-machines/MND-F45-back-extension.jpg",
    muscleGroup: "Core",
    description: "Hyperextension bench for lower back and glute strengthening. Builds posterior chain stability.",
    descriptionAr: "بنش تمديد الظهر لتقوية أسفل الظهر والأرداف. يبني استقرار السلسلة الخلفية.",
  },

  // ── EQUIPMENT ───────────────────────────────────────────────
  {
    id: "55",
    model: "MND-F41",
    name: "Decline Bench",
    nameAr: "بنش منخفض",
    slug: "MND-F41-decline-bench",
    image: "/gym-machines/Professional Decline Bench.jpg",
    muscleGroup: "Equipment",
    description: "Professional decline bench with barbell rack. For lower chest pressing movements.",
    descriptionAr: "بنش منخفض احترافي مع حامل بار. لتمارين ضغط الصدر السفلي.",
  },
  {
    id: "56",
    model: "MND-F42",
    name: "Incline Bench",
    nameAr: "بنش مائل",
    slug: "MND-F42-incline-bench",
    image: "/gym-machines/Bench Incline.jpg",
    muscleGroup: "Equipment",
    description: "Professional incline bench with barbell rack. For upper chest pressing movements.",
    descriptionAr: "بنش مائل احترافي مع حامل بار. لتمارين ضغط الصدر العلوي.",
  },
  {
    id: "57",
    model: "MND-F43",
    name: "Flat Bench",
    nameAr: "بنش مسطح",
    slug: "MND-F43-flat-bench",
    image: "/gym-machines/MND-F43-flat-bench.jpg",
    muscleGroup: "Equipment",
    description: "Professional flat bench with barbell rack. The foundation of any chest training program.",
    descriptionAr: "بنش مسطح احترافي مع حامل بار. أساس أي برنامج تدريب صدر.",
  },
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Cardio",
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Equipment",
];
