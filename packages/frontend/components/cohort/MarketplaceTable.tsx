"use client";

import Link from "next/link";
import { formatEther } from "viem";

import type { LensPublic } from "@/types/model";

type Props = {
  models: LensPublic[];
};

function weiToEthLabel(wei: number): string {
  try {
    return formatEther(BigInt(Math.trunc(wei)));
  } catch {
    return String(wei);
  }
}

export function MarketplaceTable({ models }: Props) {
  if (models.length === 0) {
    return (
      <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-slate-400">
        No hay modelos registrados. Sube uno con la API o sincroniza desde la
        cadena.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Propietario</th>
            <th className="px-4 py-3 font-medium">Formato</th>
            <th className="px-4 py-3 font-medium">Precio (ETH)</th>
            <th className="px-4 py-3 font-medium text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {models.map((m) => (
            <tr key={m.id} className="hover:bg-slate-800/40">
              <td className="px-4 py-3 font-medium text-white">{m.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">
                {m.owner.slice(0, 6)}…{m.owner.slice(-4)}
              </td>
              <td className="px-4 py-3 text-slate-300">{m.model_format}</td>
              <td className="px-4 py-3 text-slate-300">
                {weiToEthLabel(m.price_per_query_wei)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/models/${m.id}`}
                  className="inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                >
                  Usar modelo
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
