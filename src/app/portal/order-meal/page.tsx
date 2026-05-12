"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BackArrow } from "@/components/portal/BackArrow";
import { formatSyp } from "@/data/meal-cost";
import { GYM_RECEPTION_PHONE, GYM_RECEPTION_PHONE_TEL } from "@/lib/gym-contact";

type CatalogItem = {
  id: string;
  kind: "meal" | "addon";
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  unit_label_ar: string | null;
  rice_grams: number | null;
  chicken_grams: number | null;
  includes_salad: boolean;
  price_syp: number;
  calories: number | null;
};

export default function OrderMealPage() {
  const [showNotice, setShowNotice] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/portal/meal-catalog");
        const json = await res.json();
        if (res.ok && json.success) setItems(json.data ?? []);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const meals = items.filter((item) => item.kind === "meal");
  const addons = items.filter((item) => item.kind === "addon");

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="relative w-full overflow-hidden bg-[#071a12]" style={{ height: 200 }}>
        <div
          className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,#071a12 14px,#071a12 28px)",
            opacity: 0.9,
          }}
        />
        <div className="absolute inset-0 flex items-end justify-end rtl:justify-start pr-4 rtl:pl-4 rtl:pr-0 pb-2 z-0 pointer-events-none select-none">
          <div className="relative w-36 h-44 opacity-25">
            <Image src="/fig-charge.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(16,185,129,0.04) 28px,rgba(16,185,129,0.04) 30px)",
          }}
        />
        <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
          <BackArrow href="/portal" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-emerald-400">وجبة الجيم</p>
          <p className="text-white/40 text-[13px] mt-1">وجبات وإضافات بأسعار الليرة السورية</p>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,transparent 14px,transparent 28px)",
            opacity: 0.4,
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5" dir="rtl">
        {loading ? (
          <div className="text-white/35 text-[14px] text-center py-8">جاري تحميل القائمة...</div>
        ) : (
          <>
            <CatalogSection title="الوجبات" items={meals} />
            <CatalogSection title="إضافات الوجبة" items={addons} />
          </>
        )}

        {showNotice && (
          <div className="bg-gold/[0.06] border border-gold/20 p-4 text-center space-y-3">
            <div>
              <p className="text-gold text-[15px] font-semibold">يرجى زيارة الاستقبال أو الاتصال بنا</p>
              <p className="text-white/50 text-[13px] mt-1">
                لتأكيد الطلب وإتمام الدفع، تحدث مع موظف الاستقبال في النادي أو اتصل على الرقم التالي.
              </p>
            </div>
            <a
              href={GYM_RECEPTION_PHONE_TEL}
              className="block w-full bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold font-bold text-[15px] py-3 transition-colors"
              dir="ltr"
            >
              {GYM_RECEPTION_PHONE}
            </a>
          </div>
        )}

        <button
          onClick={() => setShowNotice(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[15px] py-3.5 transition-colors"
          style={{ minHeight: 52 }}
        >
          اطلب من الاستقبال
        </button>

        <p className="text-white/30 text-[12px] text-center mt-2 leading-relaxed">
          الطلب يتم عند الاستقبال. الأسعار معروضة للعميل فقط ولا تعرض أي تكلفة داخلية.
        </p>
      </div>
    </div>
  );
}

function CatalogSection({ title, items }: { title: string; items: CatalogItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-emerald-400/80 text-[13px] font-bold uppercase tracking-[0.12em]">{title}</h2>
        <span className="text-white/25 text-[11px]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] p-4 text-white/35 text-[13px]">
          لا توجد عناصر متاحة حالياً.
        </div>
      ) : items.map((item) => (
        <MealCard key={item.id} item={item} />
      ))}
    </section>
  );
}

function MealCard({ item }: { item: CatalogItem }) {
  return (
    <article className="bg-white/[0.03] border border-white/[0.06] p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white text-[18px] font-bold leading-snug">{item.name_ar}</p>
          <p className="text-white/55 text-[13px] mt-1.5 leading-relaxed">
            {item.description_ar ?? portionSummary(item)}
          </p>
        </div>
        <div className="text-left shrink-0" dir="ltr">
          <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-[0.12em] text-right" dir="rtl">
            السعر
          </p>
          <p className="text-emerald-400 text-[18px] font-bold mt-0.5">
            {formatSyp(item.price_syp)}
          </p>
        </div>
      </div>

      {item.includes_salad && (
        <div className="bg-emerald-950/30 border border-emerald-500/15 px-3 py-2">
          <p className="text-emerald-400/80 text-[12px]">تشمل سلطة طازجة</p>
        </div>
      )}
    </article>
  );
}

function portionSummary(item: CatalogItem): string {
  const parts = [];
  if (item.rice_grams) parts.push(`${item.rice_grams.toLocaleString("ar-SY")}غ رز`);
  if (item.chicken_grams) parts.push(`${item.chicken_grams.toLocaleString("ar-SY")}غ دجاج`);
  if (item.includes_salad) parts.push("سلطة");
  return parts.length > 0 ? parts.join(" + ") : item.unit_label_ar ?? "عنصر";
}
