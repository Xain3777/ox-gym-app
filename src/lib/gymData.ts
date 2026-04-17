/**
 * gymData.ts
 * Shared localStorage-based data store for InBody sessions, store sales,
 * and financial records. Autosaves on every write.
 * Manager can view live updates; reception can add entries.
 */

export type PaymentMethod = "نقدي" | "بطاقة" | "تحويل";
export type Currency = "USD" | "SYP";

// ── INBODY ──────────────────────────────────────────────────────
export interface InBodySession {
  id: string;
  date: string;          // ISO date string
  memberName: string;
  isGymMember: boolean;
  priceSYP: number;
  priceUSD: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  staff: string;
  notes?: string;
}

// ── STORE / SUPPLEMENTS / WEARABLES ─────────────────────────────
export interface StoreItem {
  id: string;
  name: string;
  category: "مكملات" | "ملابس رياضية" | "مشروبات" | "أكواب بروتين" | "وجبات" | "أخرى";
  stock: number;
  lowStockThreshold: number;
  // Manager-set cost & sell prices
  costPriceUSD: number;
  sellPriceUSD: number;
  profitMargin: string;    // e.g. "33%" or "+5$"
}

export interface StoreSale {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPriceUSD: number;
  totalUSD: number;
  paymentMethod: PaymentMethod;
  staff: string;
}

// ── SUBSCRIPTIONS (summary records) ─────────────────────────────
export interface SubscriptionRecord {
  id: string;
  date: string;
  memberName: string;
  planType: "شهري" | "ربع سنوي" | "سنوي";
  amountUSD: number;
  paymentMethod: PaymentMethod;
  staff: string;
}

// ── SALARIES ────────────────────────────────────────────────────
export interface SalaryRecord {
  id: string;
  staffName: string;
  role: string;
  monthlySalaryUSD: number;
  month: string;  // "YYYY-MM"
  paid: boolean;
}

// ── EXPENSES ────────────────────────────────────────────────────
export interface Expense {
  id: string;
  date: string;
  category: "رواتب" | "إيجار" | "صيانة" | "منتجات" | "مستلزمات" | "أخرى";
  description: string;
  amountUSD: number;
}

// ── ROOT DATA STRUCTURE ─────────────────────────────────────────
export interface GymDataStore {
  inbodySessions: InBodySession[];
  storeItems: StoreItem[];
  storeSales: StoreSale[];
  subscriptions: SubscriptionRecord[];
  salaries: SalaryRecord[];
  expenses: Expense[];
  lastUpdated: string;
}

const STORAGE_KEY = "ox_gym_data";

function defaultData(): GymDataStore {
  return {
    inbodySessions: [],
    storeItems: [
      { id: "item1",  name: "واي بروتين ٢ كجم",      category: "مكملات",        stock: 15, lowStockThreshold: 5,  costPriceUSD: 120, sellPriceUSD: 180, profitMargin: "50%" },
      { id: "item2",  name: "كبسولات BCAA",            category: "مكملات",        stock: 22, lowStockThreshold: 5,  costPriceUSD: 50,  sellPriceUSD: 75,  profitMargin: "50%" },
      { id: "item3",  name: "خلطة بري-وورك أوت",       category: "مكملات",        stock: 3,  lowStockThreshold: 5,  costPriceUSD: 55,  sellPriceUSD: 90,  profitMargin: "64%" },
      { id: "item4",  name: "قفازات رياضية (زوج)",     category: "ملابس رياضية",  stock: 30, lowStockThreshold: 8,  costPriceUSD: 20,  sellPriceUSD: 35,  profitMargin: "75%" },
      { id: "item5",  name: "تانك توب OX",              category: "ملابس رياضية",  stock: 18, lowStockThreshold: 5,  costPriceUSD: 28,  sellPriceUSD: 45,  profitMargin: "61%" },
      { id: "item6",  name: "كوب بروتين (طازج)",        category: "أكواب بروتين",  stock: 40, lowStockThreshold: 10, costPriceUSD: 8,   sellPriceUSD: 15,  profitMargin: "88%" },
      { id: "item7",  name: "مشروب BCAA (بارد)",        category: "مشروبات",       stock: 50, lowStockThreshold: 10, costPriceUSD: 5,   sellPriceUSD: 10,  profitMargin: "100%" },
      { id: "item8",  name: "وجبة دجاج",               category: "وجبات",         stock: 8,  lowStockThreshold: 3,  costPriceUSD: 14,  sellPriceUSD: 25,  profitMargin: "79%" },
      { id: "item9",  name: "كرياتين ٥٠٠ جم",           category: "مكملات",        stock: 2,  lowStockThreshold: 4,  costPriceUSD: 35,  sellPriceUSD: 60,  profitMargin: "71%" },
      { id: "item10", name: "حزام رفع أثقال",           category: "ملابس رياضية",  stock: 7,  lowStockThreshold: 3,  costPriceUSD: 50,  sellPriceUSD: 85,  profitMargin: "70%" },
    ],
    storeSales: [],
    subscriptions: [],
    salaries: [
      { id: "sal1", staffName: "كوتش ادهم", role: "مالك / مدير",         monthlySalaryUSD: 0,   month: currentMonth(), paid: true },
      { id: "sal2", staffName: "محمد",       role: "موظف استقبال",         monthlySalaryUSD: 400, month: currentMonth(), paid: false },
    ],
    expenses: [],
    lastUpdated: new Date().toISOString(),
  };
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function loadGymData(): GymDataStore {
  if (typeof window === "undefined") return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const d = defaultData();
      saveGymData(d);
      return d;
    }
    return JSON.parse(raw) as GymDataStore;
  } catch {
    return defaultData();
  }
}

export function saveGymData(data: GymDataStore): void {
  if (typeof window === "undefined") return;
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Broadcast to other tabs / manager view
  window.dispatchEvent(new StorageEvent("storage", {
    key: STORAGE_KEY,
    newValue: JSON.stringify(data),
  }));
}

/** React hook-friendly subscription */
export function subscribeToGymData(cb: (data: GymDataStore) => void): () => void {
  function handler(e: StorageEvent) {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { cb(JSON.parse(e.newValue)); } catch { /* ignore */ }
    }
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// ── HELPERS ─────────────────────────────────────────────────────
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function computeProfitMargin(cost: number, sell: number): string {
  if (cost <= 0) return "—";
  const pct = ((sell - cost) / cost) * 100;
  return `${pct.toFixed(0)}%`;
}

/** Parse a margin input: "30%" → adds 30% on top of cost; "+5" or "5" → adds $5 flat */
export function applyMargin(costUSD: number, input: string): number {
  const trimmed = input.trim();
  if (trimmed.endsWith("%")) {
    const pct = parseFloat(trimmed) / 100;
    return Math.round(costUSD * (1 + pct) * 100) / 100;
  }
  const flat = parseFloat(trimmed.replace(/^\+/, ""));
  if (!isNaN(flat)) return Math.round((costUSD + flat) * 100) / 100;
  return costUSD;
}

export const INBODY_PRICE_MEMBER_SYP = 60_000;
export const INBODY_PRICE_NONMEMBER_SYP = 100_000;
export const USD_TO_SYP_RATE = 13_000; // update as needed

export function inbodyPriceUSD(isGymMember: boolean): number {
  const syp = isGymMember ? INBODY_PRICE_MEMBER_SYP : INBODY_PRICE_NONMEMBER_SYP;
  return Math.round((syp / USD_TO_SYP_RATE) * 100) / 100;
}
