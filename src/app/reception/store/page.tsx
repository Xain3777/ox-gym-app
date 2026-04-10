"use client";

import { useTranslation } from "@/lib/i18n";
import { ShoppingBag } from "lucide-react";

export default function ReceptionStorePage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-[28px] tracking-wider text-white">{t("reception.manageStore")}</h1>

      <div className="text-center py-16">
        <ShoppingBag size={40} className="mx-auto text-white/10 mb-4" />
        <p className="text-white text-[16px] font-semibold mb-2">{t("store.title")}</p>
        <p className="text-white/40 text-[13px]">{t("store.subtitle")}</p>
      </div>
    </div>
  );
}
