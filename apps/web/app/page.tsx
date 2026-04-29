import { redirect } from "next/navigation";

// Root has no content — middleware redirects authenticated users to the dashboard
// and unauthenticated users to /login. This page is a hard fallback so Vercel
// never serves a 404 when the middleware edge function cold-starts.
export default function RootPage() {
  redirect("/login");
}
