import { redirect } from "next/navigation";

// The root "/" route redirects to login.
// Middleware handles redirecting authenticated users to dashboard or portal.
export default function RootPage() {
  redirect("/login");
}
