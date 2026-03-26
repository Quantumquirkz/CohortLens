type SkeletonProps = {
  className?: string;
};

/**
 * Pulse placeholder aligned with the exchange dark UI tokens.
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-border/60 bg-card/55 ${className}`}
      aria-hidden
    />
  );
}
