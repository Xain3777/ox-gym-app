/**
 * Normalize a Syrian phone number to its canonical digit string.
 *
 * Accepted formats:
 *   0912345678   → 963912345678  (local, 10 digits starting with 09)
 *   +963912345678 → 963912345678 (international with +)
 *   963912345678  → 963912345678 (already canonical)
 *
 * The canonical form is used to generate the internal Supabase email:
 *   963912345678@member.oxgym.app
 */
export function normalizePhone(input: string): string {
  const digits = normalizeDigits(input).replace(/\D/g, "");

  // Local Syrian format: 09XXXXXXXX (10 digits)
  if (digits.startsWith("09") && digits.length === 10) {
    return "963" + digits.slice(1); // strip leading 0, prepend country code
  }

  // International with country code: 9639XXXXXXXX (12 digits)
  if (digits.startsWith("963") && digits.length === 12) {
    return digits;
  }

  // Fallback: return raw digits (handles non-Syrian numbers)
  return digits;
}

export function normalizeDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06F0);
  });
}

/** Generate the internal Supabase auth email from a phone number. */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@member.oxgym.app`;
}

/** Returns true if the string looks like a phone number (no letters). */
export function isPhoneInput(input: string): boolean {
  return /^[+0-9]/.test(input.trim()) && !/[a-zA-Z]/.test(input);
}
