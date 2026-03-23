import Head from "next/head";
import { useConnect } from "wagmi";

import { useWallet } from "../hooks/useWallet";

export default function Home() {
  const { address, isConnected } = useWallet();
  const { connect, connectors, status } = useConnect();

  return (
    <>
      <Head>
        <title>CohortLens</title>
        <meta name="description" content="CohortLens" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-slate-100">
        <h1 className="text-3xl font-semibold tracking-tight">
          CohortLens - Coming soon
        </h1>
        <p className="max-w-md text-center text-sm text-slate-400">
          {isConnected && address
            ? `Connected: ${address.slice(0, 6)}…${address.slice(-4)}`
            : "Connect your wallet to continue (minimal flow in phase 0)."}
        </p>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          disabled={status === "pending" || connectors.length === 0}
          onClick={() => {
            const c = connectors[0];
            if (c) connect({ connector: c });
          }}
        >
          Connect
        </button>
      </main>
    </>
  );
}
