// Staff display metadata + email derivation.
// The actual staff roster lives in the `members` table (role IN
// 'manager','reception'). The staff-login page fetches it via
// /api/auth/staff. This file only owns shared types + the phone→email
// helper used on both client and server.

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
