import { Skeleton } from "@/components/ui/skeleton";

export default function ListLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex items-center gap-6 border-b border-border px-4 py-2.5">
          {[24, 32, 24, 16, 24, 12, 10].map((w, i) => (
            <Skeleton
              key={i}
              className="h-3"
              style={{ width: `${w * 4}px`, marginLeft: i === 5 ? "auto" : undefined }}
              shimmer
            />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border px-4 py-3 last:border-0">
            <Skeleton className="h-3.5 w-20" shimmer />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="ml-auto h-3.5 w-12" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}