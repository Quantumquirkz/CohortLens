import type { Cohort } from "@/types/cohort";

type CohortTableProps = {
  cohorts: Cohort[];
  totalUsers: number;
};

export function CohortTable({ cohorts, totalUsers }: CohortTableProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Usuarios totales:{" "}
        <span className="font-mono text-slate-200">{totalUsers}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-inner">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-400">
              <th className="px-4 py-3 font-medium">Cohort ID</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Centroids</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-800/90 last:border-0"
              >
                <td className="px-4 py-3 align-top font-mono text-slate-200">
                  {row.id}
                </td>
                <td className="px-4 py-3 align-top text-slate-200">
                  {row.size}
                </td>
                <td className="px-4 py-3 align-top">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/80 p-3 font-mono text-xs text-slate-300">
                    {JSON.stringify(row.center, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
