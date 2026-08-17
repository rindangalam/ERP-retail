import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession();
  redirect(session?.userId ? "/dashboard" : "/login");
}
