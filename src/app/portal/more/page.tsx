"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  OxGear, OxTrainer, OxUser, OxChevronRight,
  OxTrendUp, OxPulse, OxChat, OxStar, OxLogout, OxInfo,
} from "@/components/icons/OxIcons";

interface MoreItem {
  labelKey: string;
  subtitleKey: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const sections: { titleKey: string; items: MoreItem[] }[] = [
  {
    titleKey: "more.training",
    items: [
      { labelKey: "more.machines", subtitleKey: "more.machinesSub", href: "/portal/machines", icon: OxGear, iconBg: "bg-gold/10", iconColor: "text-gold" },
      { labelKey: "more.progress", subtitleKey: "more.progressSub", href: "/portal/progress", icon: OxTrendUp, iconBg: "bg-success/[0.12]", iconColor: "text-success" },
      { labelKey: "more.inbody", subtitleKey: "more.inbodySub", href: "/portal/inbody", icon: OxPulse, iconBg: "bg-purple-500/10", iconColor: "text-purple-400" },
    ],
  },
  {
    titleKey: "more.support",
    items: [
      { labelKey: "more.personalTrainer", subtitleKey: "more.personalTrainerSub", href: "/portal/trainer", icon: OxTrainer, iconBg: "bg-danger/[0.08]", iconColor: "text-danger" },
      { labelKey: "more.messages", subtitleKey: "more.messagesSub", href: "/portal/messages", icon: OxChat, iconBg: "bg-sky-500/10", iconColor: "text-sky-400" },
      { labelKey: "more.feedback", subtitleKey: "more.feedbackSub", href: "/portal/feedback", icon: OxStar, iconBg: "bg-gold/10", iconColor: "text-gold" },
    ],
  },
  {
    titleKey: "more.account",
    items: [
      { labelKey: "more.gymInfo",   subtitleKey: "more.gymInfoSub",   href: "/portal/gym-info", icon: OxInfo, iconBg: "bg-gold/10", iconColor: "text-gold" },
      { labelKey: "more.profile",   subtitleKey: "more.profileSub",   href: "/portal/profile",  icon: OxUser, iconBg: "bg-gold/10", iconColor: "text-gold" },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  const handleLogout = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">
          {t("more.title")}
        </h1>

        <div className="space-y-6">

          {/* ── Language Switch ─────────────────────────── */}
          <div>
            <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-2 px-1">
              {t("more.language")}
            </p>
            <div className="bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="flex" dir="ltr">
                <button
                  onClick={() => setLocale("ar")}
                  className={cn(
                    "flex-1 py-4 text-[15px] font-semibold transition-all duration-200",
                    locale === "ar"
                      ? "bg-gold/15 text-gold border-b-2 border-gold"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  العربية
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={() => setLocale("en")}
                  className={cn(
                    "flex-1 py-4 text-[15px] font-semibold transition-all duration-200",
                    locale === "en"
                      ? "bg-gold/15 text-gold border-b-2 border-gold"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.titleKey}>
              <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-2 px-1">
                {t(section.titleKey)}
              </p>
              <div className="bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.labelKey}
                      href={item.href}
                      className="flex items-center gap-4 p-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                      style={{ minHeight: "64px" }}
                    >
                      <div className={cn("w-10 h-10 flex items-center justify-center flex-shrink-0", item.iconBg)}>
                        <Icon size={20} className={item.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[16px] font-medium">{t(item.labelKey)}</p>
                        <p className="text-white/35 text-[13px] mt-0.5 truncate">{t(item.subtitleKey)}</p>
                      </div>
                      <OxChevronRight size={16} className="text-gold/30 flex-shrink-0 rtl:rotate-180" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <button
              onClick={handleLogout}
              className="w-full bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4 hover:bg-danger/[0.06] hover:border-danger/10 transition-colors"
              style={{ minHeight: "56px" }}
            >
              <div className="w-10 h-10 bg-danger/[0.08] flex items-center justify-center flex-shrink-0">
                <OxLogout size={20} className="text-danger" />
              </div>
              <p className="text-danger text-[16px] font-medium">{t("auth.logout")}</p>
            </button>
          </div>

          <p className="text-center text-white/15 text-[12px] pb-4">OX GYM · v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
