"use client";

import { useEffect, useState } from "react";
import { getAbiItem, parseAbi } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { governorAbi } from "@/lib/tokenomics-abi";
import { COHORT_GOVERNOR_ADDRESS, governanceConfigured } from "@/lib/tokenomics-config";

const governorEventsAbi = parseAbi([
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
]);

const proposalCreatedEvent = getAbiItem({
  abi: governorEventsAbi,
  name: "ProposalCreated",
});

type ProposalRow = {
  proposalId: bigint;
  description: string;
};

export default function GovernancePage() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [manualId, setManualId] = useState("1");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (!publicClient || !governanceConfigured()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const window = BigInt(20_000);
        const from = latest > window ? latest - window : BigInt(0);
        const logs = await publicClient.getLogs({
          address: COHORT_GOVERNOR_ADDRESS,
          event: proposalCreatedEvent,
          fromBlock: from,
          toBlock: latest,
        });
        if (cancelled) return;
        const rows: ProposalRow[] = logs
          .map((log) => {
            const args = log.args as {
              proposalId?: bigint;
              description?: string;
            };
            if (args.proposalId === undefined) {
              return null;
            }
            return {
              proposalId: args.proposalId,
              description: args.description ?? "",
            };
          })
          .filter((x): x is ProposalRow => x !== null);
        setProposals(rows.slice(-20).reverse());
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  const vote = (support: number) => {
    if (!governanceConfigured()) return;
    const normalized = manualId.trim();
    if (!/^\d+$/.test(normalized)) {
      setVoteError("Proposal ID must be a positive integer.");
      return;
    }
    const id = BigInt(normalized);
    setVoteError(null);
    writeContract({
      address: COHORT_GOVERNOR_ADDRESS,
      abi: governorAbi,
      functionName: "castVote",
      args: [id, support],
    });
  };

  if (!governanceConfigured()) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-white">Governance</h1>
        <p className="mt-4 text-slate-400">
          Set <code className="rounded bg-slate-900 px-1">NEXT_PUBLIC_COHORT_GOVERNOR_ADDRESS</code>{" "}
          to your deployed CohortGovernor.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Governance</h1>
      <p className="mt-2 text-sm text-slate-400">
        Lists recent ProposalCreated events (last ~20k blocks). Cast votes with your delegated
        voting power (LENS).
      </p>

      {!isConnected && (
        <p className="mt-6 text-amber-200">Connect a wallet with voting power.</p>
      )}

      {loadError && (
        <p className="mt-4 text-sm text-red-300">Could not load proposals: {loadError}</p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {proposals.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-slate-500">
                  No proposals in range (or still loading).
                </td>
              </tr>
            )}
            {proposals.map((p) => (
              <tr key={p.proposalId.toString()}>
                <td className="px-4 py-3 font-mono text-white">{p.proposalId.toString()}</td>
                <td className="px-4 py-3 text-slate-300">{p.description.slice(0, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-medium text-white">Vote</h2>
        <label className="mt-4 block text-sm">
          <span className="text-slate-500">Proposal ID</span>
          <input
            type="text"
            value={manualId}
            onChange={(e) => {
              setManualId(e.target.value);
              if (voteError) {
                setVoteError(null);
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
          />
        </label>
        {voteError && <p className="mt-2 text-sm text-red-300">{voteError}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => vote(1)}
            disabled={isPending || isConfirming}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            Vote For
          </button>
          <button
            type="button"
            onClick={() => vote(0)}
            disabled={isPending || isConfirming}
            className="rounded-lg bg-red-900/80 px-4 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
          >
            Vote Against
          </button>
          <button
            type="button"
            onClick={() => vote(2)}
            disabled={isPending || isConfirming}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Abstain
          </button>
        </div>
        {hash && (
          <p className="mt-4 font-mono text-xs text-slate-500">
            Tx: {hash}
            {isSuccess ? " ✓" : isConfirming ? " …" : ""}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-300">{error.message}</p>}
      </div>
    </section>
  );
}
