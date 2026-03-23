import { useAccount, useConnect, useDisconnect } from "wagmi";

export function useWallet() {
  const account = useAccount();
  const { connect, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    address: account.address,
    chainId: account.chainId,
    status: account.status,
    isConnected: account.isConnected,
    connect,
    connectors,
    connectStatus: status,
    disconnect,
  };
}
