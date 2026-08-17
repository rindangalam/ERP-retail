import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session?.userId) redirect("/dashboard");

  return <LoginForm />;
}
