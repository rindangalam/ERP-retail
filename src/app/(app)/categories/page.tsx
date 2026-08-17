import { requireRole } from "@/lib/dal";
import { listCategories } from "@/lib/inventory";
import { CategoriesClient } from "./categories-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireRole(["admin", "warehouse"]);

  const categories = await listCategories();

  return <CategoriesClient categories={categories} />;
}
