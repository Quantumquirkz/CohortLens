"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { erc20Abi, stakingAbi } from "@/lib/tokenomics-abi";
import {
  LENS_TOKEN_ADDRESS,
  STAKING_ADDRESS,
  tokenomicsConfigured,
} from "@/lib/tokenomics-config";

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("10");

  const staked = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "balanceOfStaked",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && tokenomicsConfigured()) },
  });

  const lensBal = useReadContract({
    address: LENS_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && tokenomicsConfigured()) },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approveAndStake = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseEther(amount);
    writeContract({
      address: LENS_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [STAKING_ADDRESS, value],
    });
  };

  const stakeAfterApprove = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseEther(amount);
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingAbi,
      functionName: "stake",
      args: [value],
    });
  };

  const withdraw = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseEther(amount);
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingAbi,
      functionName: "withdraw",
      args: [value],
    });
  };

  if (!tokenomicsConfigured()) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-white">Staking</h1>
        <p className="mt-4 text-slate-400">
          Set <code className="rounded bg-slate-900 px-1">NEXT_PUBLIC_LENS_TOKEN_ADDRESS</code>{" "}
          and <code className="rounded bg-slate-900 px-1">NEXT_PUBLIC_STAKING_ADDRESS</code>{" "}
          after deploying contracts.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Stake LENS</h1>
      <p className="mt-2 text-sm text-slate-400">
        Approve the staking contract, then stake or withdraw. Use the same wallet you use for
        model registration when the backend checks stake.
      </p>

      {!isConnected && (
        <p className="mt-6 text-amber-200">Connect a wallet to continue.</p>
      )}

      {address && (
        <div className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-300">
            LENS balance:{" "}
            <span className="font-mono text-white">
              {lensBal.data !== undefined ? formatEther(lensBal.data) : "…"}
            </span>
          </p>
          <p className="text-sm text-slate-300">
            Staked:{" "}
            <span className="font-mono text-white">
              {staked.data !== undefined ? formatEther(staked.data) : "…"}
            </span>
          </p>

          <label className="block text-sm">
            <span className="text-slate-500">Amount (LENS)</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void approveAndStake()}
              disabled={isPending || isConfirming}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => void stakeAfterApprove()}
              disabled={isPending || isConfirming}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Stake
            </button>
            <button
              type="button"
              onClick={() => void withdraw()}
              disabled={isPending || isConfirming}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              Withdraw
            </button>
          </div>

          {hash && (
            <p className="font-mono text-xs text-slate-500">
              Tx: {hash}
              {isSuccess ? " ✓" : isConfirming ? " …" : ""}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-300">{String(error.message)}</p>
          )}
        </div>
      )}
    </section>
  );
}
