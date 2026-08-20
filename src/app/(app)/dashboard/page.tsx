import { requireAuth } from "@/lib/dal";
import { roleLabels } from "@/lib/roles";
import { getDashboardSummary } from "@/lib/dashboard";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const roleLabel = roleLabels[session.role as keyof typeof roleLabels] ?? session.role;
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Selamat datang, {session.name}!</h1>
        <p className="text-sm text-muted-foreground">
          Anda login sebagai <span className="font-medium text-foreground">{roleLabel}</span>.
        </p>
      </div>
      <DashboardClient summary={summary} role={session.role} />
    </div>
  );
}
