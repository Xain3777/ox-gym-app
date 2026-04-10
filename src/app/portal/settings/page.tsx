"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxBell, OxGlobe, OxMoon, OxShield } from "@/components/icons/OxIcons";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn("w-[52px] h-[32px] rounded-full p-1 transition-colors duration-200", on ? "bg-gold" : "bg-white/10")}
    >
      <div className={cn("w-6 h-6 rounded-full bg-white shadow transition-transform duration-200", on ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />

        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">SETTINGS</h1>

        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
          <div className="flex items-center justify-between p-5" style={{ minHeight: "64px" }}>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-danger/[0.08] flex items-center justify-center"><OxBell size={18} className="text-danger" /></div>
              <div><p className="text-white text-[16px] font-medium">Notifications</p><p className="text-white/30 text-[13px] mt-0.5">Workout & meal reminders</p></div>
            </div>
            <Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />
          </div>

          <div className="flex items-center justify-between p-5" style={{ minHeight: "64px" }}>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center"><OxMoon size={18} className="text-purple-400" /></div>
              <div><p className="text-white text-[16px] font-medium">Dark Mode</p><p className="text-white/30 text-[13px] mt-0.5">Always on</p></div>
            </div>
            <Toggle on={darkMode} onToggle={() => setDarkMode(true)} />
          </div>

          <div className="flex items-center justify-between p-5" style={{ minHeight: "64px" }}>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center"><OxGlobe size={18} className="text-gold" /></div>
              <div><p className="text-white text-[16px] font-medium">Language</p><p className="text-white/30 text-[13px] mt-0.5">Choose your language</p></div>
            </div>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-white/[0.06] border-none rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:ring-1 focus:ring-gold/30 appearance-none cursor-pointer">
              <option value="en" className="bg-iron">English</option>
              <option value="ar" className="bg-iron">العربية</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-5" style={{ minHeight: "64px" }}>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-success/[0.12] flex items-center justify-center"><OxShield size={18} className="text-success" /></div>
              <div><p className="text-white text-[16px] font-medium">Privacy</p><p className="text-white/30 text-[13px] mt-0.5">Manage your data</p></div>
            </div>
            <span className="text-white/15 text-[12px] font-medium">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
