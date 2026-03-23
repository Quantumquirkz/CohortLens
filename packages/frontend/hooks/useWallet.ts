"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

/**
 * Encapsulates Wagmi account and connection actions for reuse outside `WalletButton`.
 */
export function useWallet() {
  const account = useAccount();
  const { connect, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    address: account.address,
    chainId: account.chainId,
    status: account.status,
    isConnected: account.isConnected,
    isConnecting: account.isConnecting,
    isReconnecting: account.isReconnecting,
    connect,
    connectors,
    connectStatus: status,
    disconnect,
  };
}
