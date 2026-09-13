import { getProfile, requireUser } from "@/lib/auth/require-user";
import { AppHeader } from "./app-header";

/**
 * Layout wrapper for signed-in pages. Auth + profile lookups are cached per
 * request, so the page's own requireUser()/requireStaff() adds no extra round trips.
 */
export async function AppShell({
  children,
  nextPath,
}: {
  children: React.ReactNode;
  nextPath: string;
}) {
  const { user } = await requireUser(nextPath);
  const profile = await getProfile(user.id);

  return (
    <>
      <AppHeader
        user={user}
        role={profile?.role ?? "student"}
        fullName={profile?.full_name}
        lineName={profile?.line_name ?? null}
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </div>
    </>
  );
}
