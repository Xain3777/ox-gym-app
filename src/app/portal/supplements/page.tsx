"use client";

import { redirect } from "next/navigation";

// Supplements are now part of the unified Shop page
export default function SupplementsRedirect() {
  redirect("/portal/shop");
  return null;
}
