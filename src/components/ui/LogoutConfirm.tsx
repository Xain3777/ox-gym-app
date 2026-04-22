"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase";

interface LogoutConfirmProps {
  className?: string;
  label?: string;
}

export function LogoutButton({ className, label = "تسجيل الخروج" }: LogoutConfirmProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function doLogout() {
    setLoading(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "flex items-center gap-2 w-full px-1 py-2 text-[12px] text-muted hover:text-danger transition-colors font-mono tracking-[0.08em] uppercase"}
      >
        <LogOut size={13} />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-[320px] bg-charcoal border border-steel shadow-dark-xl">
            {/* Gold top stripe */}
            <div
              className="h-1 w-full"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #F5C100 0px, #F5C100 4px, transparent 4px, transparent 8px)`,
              }}
            />

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <LogOut size={18} className="text-danger" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[15px]">تسجيل الخروج</h3>
                  <p className="text-muted text-[12px] mt-0.5">هل أنت متأكد من تسجيل الخروج؟</p>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={doLogout}
                  disabled={loading}
                  className="flex-1 h-10 bg-danger text-white text-[13px] font-semibold hover:bg-danger/80 transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري الخروج..." : "نعم، تسجيل الخروج"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 bg-iron border border-steel text-muted text-[13px] hover:text-offwhite transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
