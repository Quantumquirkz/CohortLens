"use client";

import Link from "next/link";
import { formatEther } from "viem";

import { primaryButtonSmClass } from "@/lib/button-classes";
import { toWeiBigInt } from "@/lib/wei";
import type { LensPublic } from "@/types/model";

type Props = {
  models: LensPublic[];
};

function weiToEthLabel(wei: number | string): string {
  try {
    return formatEther(toWeiBigInt(wei));
  } catch {
    return String(wei);
  }
}

export function MarketplaceTable({ models }: Props) {
  if (models.length === 0) {
    return (
      <p className="surface-panel px-4 py-8 text-center text-muted-foreground">
        No registered models. Upload one via the API or sync from chain.
      </p>
    );
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead className="data-table-head">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Format</th>
            <th className="px-4 py-3 font-medium">Price (LENS)</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {models.map((m) => (
            <tr key={m.id} className="data-table-row">
              <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {m.owner.slice(0, 6)}…{m.owner.slice(-4)}
              </td>
              <td className="px-4 py-3 text-card-foreground">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">
                  {m.model_format}
                </span>
              </td>
              <td className="px-4 py-3 text-card-foreground">
                {weiToEthLabel(m.price_per_query_wei)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/models/${m.id}`} className={primaryButtonSmClass}>
                  Use model
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
