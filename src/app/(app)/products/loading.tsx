import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-2 py-2.5 last:border-b-0">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
