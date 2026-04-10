import { PortalSidebar, PortalBottomNav } from "@/components/client/PortalNav";
import { RoleToggle } from "@/components/client/RoleToggle";
import { ToastProvider } from "@/components/ui/Toast";

// ── CLIENT PORTAL LAYOUT ────────────────────────────────────────
// Full-screen app layout. Dark, powerful, OX brand.

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-void">
        {/* Desktop sidebar */}
        <PortalSidebar />

        {/* Main content — full screen, internal scroll only */}
        <main className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="relative z-10 flex-1 overflow-y-auto scroll-smooth bg-chevron-pattern">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav — 4 tabs */}
        <PortalBottomNav />

        {/* Role toggle — temporary dev tool */}
        <RoleToggle />
      </div>
    </ToastProvider>
  );
}
