import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { LogoWatermark } from "@/components/ui/BullDecor";
import { RoleToggle } from "@/components/client/RoleToggle";

// This layout wraps all routes inside (admin)/
// It renders the persistent sidebar on desktop
// and the bottom navigation on mobile.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden bg-void">

      {/* ── DESKTOP SIDEBAR ── hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Single subtle watermark — avoids visual clutter */}
        <LogoWatermark position="bottom-right" size={100} opacity={3} className="mr-8 mb-8 hidden md:block" />

        {/* Scrollable content region */}
        <div className="relative z-10 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── shown only on mobile */}
      <BottomNav />

      {/* Role toggle — temporary dev tool */}
      <RoleToggle />
    </div>
    </ToastProvider>
  );
}
