import { redirect } from "next/navigation";

// /admin → redirects to /dashboard (admin area)
export default function AdminRedirect() {
  redirect("/dashboard");
}
