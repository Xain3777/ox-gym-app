import { PortalSidebar, PortalBottomNav } from "@/components/client/PortalNav";
import { ToastProvider } from "@/components/ui/Toast";
import { SubscriptionBlocker } from "@/components/portal/SubscriptionBlocker";

// ── CLIENT PORTAL LAYOUT ────────────────────────────────────────
// Full-screen app layout. Dark, powerful, OX brand.

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <SubscriptionBlocker>
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
        </div>
      </SubscriptionBlocker>
    </ToastProvider>
  );
}
