"use client";

import Link from "next/link";
import { useState } from "react";

import { useRiskScreen } from "@/hooks/useRiskDashboard";
import type { RiskClientProfile } from "@/types/risk";

export default function RiskScreenPage() {
  const screen = useRiskScreen();
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("polygon");
  const [profile, setProfile] = useState<RiskClientProfile>("dapp");

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10">
      <div className="rounded-2xl border border-border/60 bg-card/30 p-4 text-sm text-muted-foreground">
        Screening en tiempo real sobre Aave v3 indexado. No es KYC ni listas sancionadas.
      </div>

      <Link href="/risk" className="text-sm text-cyan-300 hover:underline">
        Volver a casos
      </Link>

      <h1 className="text-xl font-semibold text-foreground">Screening de cartera</h1>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void screen.mutateAsync({
            chain_id: chainId,
            address: address.trim().toLowerCase(),
            client_profile: profile,
            options: { include_graph_hints: true },
          });
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Chain id</span>
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Direccion 0x</span>
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x"
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Perfil cliente</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={profile}
            onChange={(e) => setProfile(e.target.value as RiskClientProfile)}
          >
            <option value="dapp">dApp</option>
            <option value="exchange">Exchange</option>
            <option value="custody">Custody</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={screen.isPending}
          className="w-full rounded-full bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 ring-1 ring-cyan-500/40 disabled:opacity-50"
        >
          {screen.isPending ? "Analizando" : "Ejecutar screening"}
        </button>
      </form>

      {screen.isError ? (
        <p className="text-sm text-red-300">Error en screening.</p>
      ) : null}

      {screen.data ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Score:</span>{" "}
            <strong>{screen.data.risk_score}</strong> ({screen.data.severity})
          </p>
          <p>
            <span className="text-muted-foreground">Accion sugerida:</span>{" "}
            {screen.data.recommended_action}
          </p>
          <p className="text-xs text-muted-foreground">
            Latencia {screen.data.latency_ms} ms
            {screen.data.degraded ? " (degradado)" : ""}
          </p>
          <details>
            <summary className="cursor-pointer text-cyan-200">Motivos</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-background/80 p-2 text-xs">
              {JSON.stringify(screen.data.risk_reasons, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
