"use client";

import { useAccount, useConnect } from "wagmi";

import { primaryButtonClass } from "@/lib/button-classes";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status } = useConnect();

  const primary = connectors[0];

  if (isConnected && address) {
    return (
      <span className="rounded-lg border border-border/15 bg-card/90 px-3 py-1.5 font-mono text-xs text-card-foreground shadow-sm backdrop-blur-sm transition-colors duration-200 sm:text-sm">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={primaryButtonClass}
      disabled={status === "pending" || !primary}
      onClick={() => {
        if (primary) connect({ connector: primary });
      }}
    >
      {status === "pending" ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
