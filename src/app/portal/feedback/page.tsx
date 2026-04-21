"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxStar, OxDumbbell, OxFork, OxTrainer, OxThumbUp, OxCheck } from "@/components/icons/OxIcons";

const sections = [
  { id: "workouts", label: "التمارين",    icon: OxDumbbell, description: "كيف تجد برامج التمارين؟" },
  { id: "meals",    label: "الوجبات",     icon: OxFork,     description: "قيّم خطة الوجبات الخاصة بك." },
  { id: "trainer",  label: "المدرب",      icon: OxTrainer,  description: "كيف تجد مدربك؟" },
  { id: "overall",  label: "التجربة عامة", icon: OxThumbUp,  description: "تقييمك العام للنادي." },
];

type Ratings = Record<string, number>;
type Comments = Record<string, string>;

export default function FeedbackPage() {
  const [ratings, setRatings] = useState<Ratings>({ workouts: 0, meals: 0, trainer: 0, overall: 0 });
  const [comments, setComments] = useState<Comments>({ workouts: "", meals: "", trainer: "", overall: "" });
  const [hoveredStar, setHoveredStar] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setRating = (section: string, value: number) => setRatings((prev) => ({ ...prev, [section]: value }));
  const setComment = (section: string, value: string) => setComments((prev) => ({ ...prev, [section]: value }));
  const setHover = (section: string, value: number) => setHoveredStar((prev) => ({ ...prev, [section]: value }));
  const hasAnyRating = Object.values(ratings).some((r) => r > 0);

  async function handleSubmit() {
    if (!hasAnyRating || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings, comments }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setSubmitError("حدث خطأ. حاول مرة أخرى.");
      }
    } catch {
      setSubmitError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-full pb-28 lg:pb-10" dir="rtl">
        <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
          <BackArrow href="/portal/more" />
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
              <OxCheck size={28} className="text-gold" />
            </div>
            <h2 className="text-white font-display text-[28px] tracking-wider">شكراً لك!</h2>
            <p className="text-white/40 text-[15px] mt-2 max-w-sm mx-auto">تم إرسال رأيك بنجاح. نقدّر تقييمك ونسعى دائماً للتطوير.</p>
            <button
              onClick={() => {
                setSubmitted(false);
                setRatings({ workouts: 0, meals: 0, trainer: 0, overall: 0 });
                setComments({ workouts: "", meals: "", trainer: "", overall: "" });
              }}
              className="mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[15px] px-6 py-3.5 transition-colors"
            >
              إرسال تقييم آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">التقييمات</h1>
        <p className="text-white/35 text-[14px] mb-6">ساعدنا في تحسين تجربتك</p>

        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const currentRating = ratings[section.id];
            const currentHover = hoveredStar[section.id] || 0;
            const displayRating = currentHover || currentRating;
            return (
              <div key={section.id} className="bg-white/[0.03] border border-white/[0.06] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-[16px] font-semibold">{section.label}</p>
                    <p className="text-white/30 text-[13px]">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-3" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(section.id, star)}
                      onMouseEnter={() => setHover(section.id, star)}
                      onMouseLeave={() => setHover(section.id, 0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <OxStar size={28} className={cn("transition-colors", star <= displayRating ? "text-gold" : "text-white/10")} />
                    </button>
                  ))}
                  {currentRating > 0 && (
                    <span className="text-white/30 text-[13px] mr-2">{currentRating}/5</span>
                  )}
                </div>
                <input
                  type="text"
                  value={comments[section.id]}
                  onChange={(e) => setComment(section.id, e.target.value)}
                  placeholder="أضف تعليقاً (اختياري)..."
                  className="w-full bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition"
                />
              </div>
            );
          })}
        </div>

        {submitError && (
          <p className="text-danger text-[13px] text-center mt-4">{submitError}</p>
        )}

        <button
          disabled={!hasAnyRating || submitting}
          onClick={handleSubmit}
          className={cn(
            "mt-6 w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-all duration-200",
            (!hasAnyRating || submitting) && "opacity-30 cursor-not-allowed"
          )}
          style={{ minHeight: "56px" }}
        >
          {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
        </button>
      </div>
    </div>
  );
}
