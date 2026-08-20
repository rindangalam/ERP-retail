import { requireAuth } from "@/lib/dal";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const notifications = await getNotifications(session.userId, session.role);

  return (
    <AppShell
      userName={session.name || session.userId}
      userRole={session.role}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
