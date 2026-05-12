// Central constant for the gym / reception phone. Update here only.
// Used by portal pages (order meal, grace-period notice, subscribe
// card, gym info) so a future change is a one-line edit.

export const GYM_RECEPTION_PHONE = "0936755515";

// tel: target — drops non-digits so the dialer parses cleanly.
export const GYM_RECEPTION_PHONE_TEL = `tel:${GYM_RECEPTION_PHONE.replace(/\D/g, "")}`;
