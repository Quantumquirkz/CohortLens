import type { Cohort } from "@/types/cohort";

type CohortTableProps = {
  cohorts: Cohort[];
  totalUsers: number;
};

export function CohortTable({ cohorts, totalUsers }: CohortTableProps) {
  const maxSize = Math.max(
    ...cohorts.map((c) => (typeof c.size === "number" ? c.size : 0)),
    1,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Total users:{" "}
        <span className="font-mono text-card-foreground">{totalUsers}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/10 bg-card/40 shadow-inner backdrop-blur-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/10 bg-card/60 text-muted-foreground">
              <th className="px-4 py-3 font-medium">Cohort ID</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Centroids</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => {
              const size = row.size;
              const pct = Math.min(100, Math.round((size / maxSize) * 100));
              return (
                <tr
                  key={row.id}
                  className="border-b border-border/10 last:border-0"
                >
                  <td className="px-4 py-3 align-top font-mono text-card-foreground">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 align-top text-card-foreground">
                    <div className="flex max-w-[140px] flex-col gap-1.5">
                      <span className="tabular-nums">{size}</span>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-border/10"
                        title={`${size} users (max cohort ${maxSize})`}
                      >
                        <div
                          className="h-full rounded-full bg-accent/55 transition-[width] duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/10 bg-background/80 p-3 font-mono text-xs text-muted-foreground">
                      {JSON.stringify(row.center, null, 2)}
                    </pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
