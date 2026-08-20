import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = false,
  ...props
}: React.ComponentProps<"div"> & { shimmer?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted dark:bg-muted/70",
        shimmer && "shimmer-sweep",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
