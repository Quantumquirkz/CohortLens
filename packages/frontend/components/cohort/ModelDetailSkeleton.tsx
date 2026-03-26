import { Skeleton } from "@/components/ui/Skeleton";

export function ModelDetailSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-20 w-full max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
