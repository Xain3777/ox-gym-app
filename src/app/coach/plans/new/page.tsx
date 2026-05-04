import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CreatePlanForm } from "@/components/admin/CreatePlanForm";

export const metadata: Metadata = { title: "برنامج تمرين جديد" };

export default function CoachNewPlanPage() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] tracking-wider text-white">
          برنامج تمرين جديد
        </h1>
        <Link
          href="/coach/plans"
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-[12px] font-mono uppercase tracking-wider transition-colors"
        >
          <ArrowRight size={14} />
          رجوع
        </Link>
      </div>
      <CreatePlanForm returnPath="/coach/plans" />
    </div>
  );
}
