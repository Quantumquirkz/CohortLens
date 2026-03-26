import { Skeleton } from "@/components/ui/Skeleton";

export function MarketplaceLoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/10 bg-card/30">
      <div className="space-y-0 divide-y divide-border/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 flex-1 max-w-[12rem]" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
