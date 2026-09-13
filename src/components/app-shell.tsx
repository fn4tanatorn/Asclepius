import { requireUser } from "@/lib/auth/require-user";
import { AppHeader } from "./app-header";

/**
 * Layout wrapper for signed-in pages. Fetches the profile once for the header.
 * Pages still call requireUser()/requireStaff() themselves for authorization.
 */
export async function AppShell({
  children,
  nextPath,
}: {
  children: React.ReactNode;
  nextPath: string;
}) {
  const { supabase, user } = await requireUser(nextPath);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppHeader user={user} role={profile?.role ?? "student"} fullName={profile?.full_name} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>
    </>
  );
}
