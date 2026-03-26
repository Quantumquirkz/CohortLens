type SkeletonProps = {
  className?: string;
};

/**
 * Pulse placeholder aligned with dark tokens (`border-border/10`, `bg-card/40`).
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md border border-border/10 bg-card/40 ${className}`}
      aria-hidden
    />
  );
}
