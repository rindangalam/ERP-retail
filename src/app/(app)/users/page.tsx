import { requireRole } from "@/lib/dal";
import { adminDatabases } from "@/lib/appwrite-server";
import { roleLabels } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ProfileDoc = {
  $id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default async function UsersPage() {
  await requireRole(["admin"]);

  const result = await adminDatabases().listDocuments("erp", "user_profiles");
  const profiles = result.documents as unknown as ProfileDoc[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Hanya dapat diakses oleh role Admin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar profil</CardTitle>
          <CardDescription>Data dari collection user_profiles.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Nama</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.$id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{profile.full_name}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="secondary">{roleLabels[profile.role as keyof typeof roleLabels] ?? profile.role}</Badge>
                  </td>
                  <td className="py-2">
                    {profile.is_active ? (
                      <Badge variant="outline" className="text-emerald-600">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
