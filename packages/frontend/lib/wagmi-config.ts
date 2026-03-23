import { createConfig, http } from "wagmi";
import { polygon, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [sepolia, polygon],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [polygon.id]: http(),
  },
});
