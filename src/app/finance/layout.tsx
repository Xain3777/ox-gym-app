import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { RoleToggle } from "@/components/client/RoleToggle";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-void">
        <div className="hidden md:flex md:flex-shrink-0">
          <Sidebar />
        </div>
        <main className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="relative z-10 flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
        <BottomNav />
        <RoleToggle />
      </div>
    </ToastProvider>
  );
}
