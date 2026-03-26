"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  positiveButtonClass,
  primaryButtonClass,
  primarySoftButtonClass,
} from "@/lib/button-classes";
import { erc20Abi, stakingAbi } from "@/lib/tokenomics-abi";
import {
  LENS_TOKEN_ADDRESS,
  STAKING_ADDRESS,
  tokenomicsConfigured,
} from "@/lib/tokenomics-config";

function EnvHintCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border/10 bg-card px-1.5 py-0.5 font-mono text-xs text-card-foreground">
      {children}
    </code>
  );
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("10");
  const [inputError, setInputError] = useState<string | null>(null);

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

  const parseAmount = (): bigint | null => {
    try {
      const value = parseEther(amount.trim());
      if (value <= 0n) {
        setInputError("Amount must be greater than 0.");
        return null;
      }
      setInputError(null);
      return value;
    } catch {
      setInputError("Invalid amount format.");
      return null;
    }
  };

  const approveAndStake = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseAmount();
    if (value === null) return;
    writeContract({
      address: LENS_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [STAKING_ADDRESS, value],
    });
  };

  const stakeAfterApprove = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseAmount();
    if (value === null) return;
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingAbi,
      functionName: "stake",
      args: [value],
    });
  };

  const withdraw = () => {
    if (!address || !tokenomicsConfigured()) return;
    const value = parseAmount();
    if (value === null) return;
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Staking
        </h1>
        <p className="mt-4 text-muted-foreground">
          Set <EnvHintCode>NEXT_PUBLIC_LENS_TOKEN_ADDRESS</EnvHintCode> and{" "}
          <EnvHintCode>NEXT_PUBLIC_STAKING_ADDRESS</EnvHintCode> after deploying
          contracts.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="surface-card">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
          Tokenomics
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Stake LENS
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
        Approve the staking contract, then stake or withdraw. Use the same wallet
        you use for model registration when the backend checks stake.
        </p>
      </div>

      {!isConnected && (
        <p className="mt-6 rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          Connect a wallet to continue.
        </p>
      )}

      {address && (
        <div className="surface-card mt-6 space-y-4">
          <p className="text-sm text-card-foreground">
            LENS balance:{" "}
            <span className="font-mono text-foreground">
              {lensBal.data !== undefined ? formatEther(lensBal.data) : "…"}
            </span>
          </p>
          <p className="text-sm text-card-foreground">
            Staked:{" "}
            <span className="font-mono text-foreground">
              {staked.data !== undefined ? formatEther(staked.data) : "…"}
            </span>
          </p>

          <label className="block text-sm">
            <span className="text-muted-foreground">Amount (LENS)</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (inputError) {
                  setInputError(null);
                }
              }}
              className="input-field mt-1.5 font-mono"
            />
          </label>
          {inputError && <p className="text-sm text-destructive">{inputError}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void approveAndStake()}
              disabled={isPending || isConfirming}
              className={primaryButtonClass}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => void stakeAfterApprove()}
              disabled={isPending || isConfirming}
              className={positiveButtonClass}
            >
              Stake
            </button>
            <button
              type="button"
              onClick={() => void withdraw()}
              disabled={isPending || isConfirming}
              className={primarySoftButtonClass}
            >
              Withdraw
            </button>
          </div>

          {hash && (
            <p className="font-mono text-xs text-muted-foreground">
              Tx: {hash}
              {isSuccess ? " ✓" : isConfirming ? " …" : ""}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{String(error.message)}</p>
          )}
        </div>
      )}
    </section>
  );
}
