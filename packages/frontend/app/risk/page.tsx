"use client";

import Link from "next/link";

import { useRiskCases } from "@/hooks/useRiskDashboard";

function statusBadge(status: string) {
  const d =
    "rounded-full px-2 py-0.5 text-xs font-medium border border-border/60";
  switch (status) {
    case "open":
      return `${d} bg-amber-500/10 text-amber-200`;
    case "in_review":
      return `${d} bg-sky-500/10 text-sky-200`;
    case "resolved":
      return `${d} bg-emerald-500/10 text-emerald-200`;
    case "false_positive":
      return `${d} bg-muted text-muted-foreground`;
    default:
      return `${d} bg-card`;
  }
}

export default function RiskDashboardPage() {
  const { data, isLoading, error, refetch } = useRiskCases();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        <p className="font-semibold text-amber-100">Aviso de cumplimiento</p>
        <p className="mt-1 text-amber-100/85">
          CohortLens Risk Intelligence es senal de comportamiento on-chain (alcance Aave v3
          indexado). No sustituye programas KYC/AML/KYB regulados ni dictamen legal.
        </p>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Risk y compliance
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cola de casos desde decisiones con severidad MEDIA o superior. Opcional: variable{" "}
            <code className="rounded bg-card px-1 text-xs">NEXT_PUBLIC_RISK_API_KEY</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/risk/screen"
            className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
          >
            Nuevo screening
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-card"
          >
            Actualizar
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando casos</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-300">
          Error al cargar casos. Compruebe API y clave de riesgo.
        </p>
      ) : null}

      {data && data.length === 0 && !isLoading ? (
        <p className="text-sm text-muted-foreground">
          Sin casos. Ejecute screening con severidad MEDIA+.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-card/80 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Chain</th>
                <th className="px-4 py-3">Direccion</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/40 last:border-0 hover:bg-card/60"
                >
                  <td className="px-4 py-3">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.chain_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.address}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/risk/cases/${c.id}`}
                      className="text-cyan-300 hover:underline"
                    >
                      Ver caso
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
