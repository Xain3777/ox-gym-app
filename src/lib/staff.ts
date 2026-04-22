// Staff display metadata only — NO secrets here.
// Authentication is handled entirely by Supabase Auth (phone → email mapping).
// To add/remove staff: update Supabase Auth users + the members table role column.
export const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: "adham",
    name: "كوتش ادهم",
    title: "المالك",
    role: "manager" as const,
    phone: "0000000001",
  },
  {
    id: "mohammad",
    name: "محمد",
    title: "موظف استقبال",
    role: "reception" as const,
    phone: "0000000002",
  },
];

export interface StaffAccount {
  id: string;
  name: string;
  title: string;
  role: "manager" | "reception";
  phone: string;
}

/** Convert a phone number to the internal Supabase auth email format. */
export function getStaffEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@member.oxgym.app`;
}
