"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getAbiItem, parseAbi } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  dangerSoftButtonClass,
  positiveButtonClass,
  primarySoftButtonClass,
} from "@/lib/button-classes";
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

function EnvHintCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border/10 bg-card px-1.5 py-0.5 font-mono text-xs text-card-foreground">
      {children}
    </code>
  );
}

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Governance
        </h1>
        <p className="mt-4 text-muted-foreground">
          Set <EnvHintCode>NEXT_PUBLIC_COHORT_GOVERNOR_ADDRESS</EnvHintCode> to
          your deployed CohortGovernor.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Governance
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lists recent ProposalCreated events (last ~20k blocks). Cast votes with
        your delegated voting power (LENS).
      </p>

      {!isConnected && (
        <p className="mt-6 rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          Connect a wallet with voting power.
        </p>
      )}

      {loadError && (
        <p className="mt-4 text-sm text-destructive">
          Could not load proposals: {loadError}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-border/10 bg-card/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/10 bg-card/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {proposals.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-muted-foreground">
                  No proposals in range (or still loading).
                </td>
              </tr>
            )}
            {proposals.map((p) => (
              <tr key={p.proposalId.toString()} className="hover:bg-card/40">
                <td className="px-4 py-3 font-mono text-foreground">
                  {p.proposalId.toString()}
                </td>
                <td className="px-4 py-3 text-card-foreground">
                  {p.description.slice(0, 120)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="surface-card mt-10">
        <h2 className="text-lg font-medium text-foreground">Vote</h2>
        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Proposal ID</span>
          <input
            type="text"
            value={manualId}
            onChange={(e) => {
              setManualId(e.target.value);
              if (voteError) {
                setVoteError(null);
              }
            }}
            className="input-field mt-1.5 font-mono"
          />
        </label>
        {voteError && (
          <p className="mt-2 text-sm text-destructive">{voteError}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => vote(1)}
            disabled={isPending || isConfirming}
            className={positiveButtonClass}
          >
            Vote for
          </button>
          <button
            type="button"
            onClick={() => vote(0)}
            disabled={isPending || isConfirming}
            className={dangerSoftButtonClass}
          >
            Vote against
          </button>
          <button
            type="button"
            onClick={() => vote(2)}
            disabled={isPending || isConfirming}
            className={primarySoftButtonClass}
          >
            Abstain
          </button>
        </div>
        {hash && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Tx: {hash}
            {isSuccess ? " ✓" : isConfirming ? " …" : ""}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive">{error.message}</p>
        )}
      </div>
    </section>
  );
}
