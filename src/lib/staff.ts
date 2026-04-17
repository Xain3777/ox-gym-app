// Staff accounts — update phone numbers to match Supabase auth accounts
// PIN is the staff member's login password
export const STAFF_ACCOUNTS = [
  {
    id: "adham",
    name: "كوتش ادهم",
    title: "المالك",
    role: "manager" as const,
    // phone number registered in Supabase (digits only)
    phone: "0000000001",
    pin: "1234",
  },
  {
    id: "mohammad",
    name: "محمد",
    title: "موظف استقبال",
    role: "reception" as const,
    phone: "0000000002",
    pin: "1234",
  },
] satisfies StaffAccount[];

export interface StaffAccount {
  id: string;
  name: string;
  title: string;
  role: "manager" | "reception";
  phone: string;
  pin: string;
}

export function getStaffEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@member.oxgym.app`;
}
