import type { AppProps } from "next/app";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { polygon, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import "../styles/globals.css";

// Placeholder: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to integrate WalletConnect in later phases.
const config = createConfig({
  chains: [sepolia, polygon],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [polygon.id]: http(),
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
