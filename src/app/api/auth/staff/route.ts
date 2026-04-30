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
    .in("role", ["manager", "reception"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const staff = (data ?? [])
    .filter((m) => m.phone)
    .map((m) => ({
      id:    m.id,
      name:  m.full_name,
      role:  m.role as "manager" | "reception",
      title: m.role === "manager" ? "المالك" : "موظف استقبال",
      phone: m.phone as string,
    }));

  return NextResponse.json({ success: true, data: staff });
}
