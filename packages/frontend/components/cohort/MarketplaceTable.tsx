"use client";

import Link from "next/link";
import { formatEther } from "viem";

import { primaryButtonSmClass } from "@/lib/button-classes";
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
      <p className="rounded-xl border border-border/10 bg-card/40 px-4 py-8 text-center text-muted-foreground">
        No registered models. Upload one via the API or sync from chain.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/10 bg-card/40 backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/10 bg-card/70 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Format</th>
            <th className="px-4 py-3 font-medium">Price (LENS)</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
          {models.map((m) => (
            <tr key={m.id} className="transition-colors hover:bg-card/50">
              <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {m.owner.slice(0, 6)}…{m.owner.slice(-4)}
              </td>
              <td className="px-4 py-3 text-card-foreground">{m.model_format}</td>
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
