"use client";

import { useAccount, useChainId } from "wagmi";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  137: "Polygon",
};

export function ChainBadge() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Evita errores de hidratación:
  // si devolvemos `null` en SSR pero en client mostramos el badge,
  // el árbol de React cambia de forma estructural.
  const label = CHAIN_NAMES[chainId] ?? `Chain ${chainId ?? ""}`;

  return (
    <span
      className={
        isConnected
          ? "max-w-[7rem] truncate rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-cyan-100 sm:inline-block"
          : "hidden max-w-[7rem] truncate rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-cyan-100 sm:inline-block"
      }
      title={isConnected ? label : undefined}
      aria-hidden={!isConnected}
      suppressHydrationWarning
    >
      {label}
    </span>
  );
}
