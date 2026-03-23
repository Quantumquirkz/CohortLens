"use client";

import { useAccount, useConnect } from "wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status } = useConnect();

  const primary = connectors[0];

  if (isConnected && address) {
    return (
      <span className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 font-mono text-xs text-slate-200 sm:text-sm">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={status === "pending" || !primary}
      onClick={() => {
        if (primary) connect({ connector: primary });
      }}
    >
      {status === "pending" ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
