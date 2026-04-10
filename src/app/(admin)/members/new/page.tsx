import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopBar, StripeDivider } from "@/components/layout/TopBar";
import { AddMemberForm } from "@/components/admin/AddMemberForm";

export const metadata: Metadata = { title: "Add Member" };

export default function NewMemberPage() {
  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="ADD MEMBER"
        eyebrow="Members"
        actions={
          <Link
            href="/members"
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-offwhite transition-colors"
          >
            <ArrowLeft size={12} />
            Back
          </Link>
        }
      />
      <StripeDivider thin />

      <div className="flex-1 p-6 pb-20 md:pb-6">
        <div className="max-w-[680px]">
          {/* Wrap with ToastProvider via layout — AddMemberForm uses useToast */}
          <AddMemberForm />
        </div>
      </div>
    </div>
  );
}
