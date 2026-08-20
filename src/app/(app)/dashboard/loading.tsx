import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card space-y-2 px-4 py-3 shadow-card"
          >
            <Skeleton className="h-2.5 w-16" shimmer />
            <Skeleton className="h-5 w-24" shimmer />
            <Skeleton className="h-3 w-20" shimmer />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-card lg:col-span-2">
          <Skeleton className="h-3.5 w-32" shimmer />
          <div className="mt-4 flex h-44 items-end gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${20 + ((i * 37) % 60)}%` }}
                shimmer
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-card">
          <Skeleton className="h-3.5 w-32" shimmer />
          <div className="mx-auto mt-4 size-36 rounded-full bg-muted/60" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" shimmer />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-3.5 w-28" shimmer />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" shimmer />
          ))}
        </div>
      </div>
    </div>
  );
}