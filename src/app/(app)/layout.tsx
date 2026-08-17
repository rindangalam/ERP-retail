import { requireAuth } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <AppShell userName={session.name || session.userId} userRole={session.role}>
      {children}
    </AppShell>
  );
}
