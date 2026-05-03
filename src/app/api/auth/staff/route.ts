import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/auth/staff
// Returns the live manager + reception roster for the staff-login dropdown.
// No secrets returned — phone is needed client-side because login derives
// the internal Supabase email from it.
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, phone, role")
    .in("role", ["manager", "reception", "head_coach", "coach"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const titleByRole: Record<string, string> = {
    manager:    "المالك",
    reception:  "موظف استقبال",
    head_coach: "الهيد كوتش",
    coach:      "الكوتش",
  };

  const staff = (data ?? [])
    .filter((m) => m.phone)
    .map((m) => ({
      id:    m.id,
      name:  m.full_name,
      role:  m.role as "manager" | "reception" | "head_coach" | "coach",
      title: titleByRole[m.role as string] ?? m.role,
      phone: m.phone as string,
    }));

  return NextResponse.json({ success: true, data: staff });
}
