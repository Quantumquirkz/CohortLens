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

  if (!isConnected) {
    return null;
  }

  const label = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

  return (
    <span
      className="hidden max-w-[7rem] truncate rounded-full border border-border/15 bg-card/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline-block"
      title={label}
    >
      {label}
    </span>
  );
}
