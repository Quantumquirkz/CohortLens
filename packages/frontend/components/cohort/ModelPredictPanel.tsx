"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { fetchPredictionStatus, useModelPredict } from "@/hooks/useModelsApi";
import { cohortOracleAbi, erc20Abi } from "@/lib/tokenomics-abi";
import {
  COHORT_ORACLE_ADDRESS,
  LENS_TOKEN_ADDRESS,
  tokenomicsConfigured,
} from "@/lib/tokenomics-config";
import type { LensPublic } from "@/types/model";

type Props = {
  model: LensPublic;
};

function parseFeatures(input: string): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return null;
      }
      const nums = parsed.map((x) => Number(x));
      if (nums.some((n) => Number.isNaN(n))) {
        return null;
      }
      return nums;
    } catch {
      return null;
    }
  }
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n))) {
    return null;
  }
  return nums;
}

export function ModelPredictPanel({ model }: Props) {
  const { address, isConnected } = useAccount();
  const [rawFeatures, setRawFeatures] = useState("0, 0, 0, 0");
  const [asyncMode, setAsyncMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [lensPaymentDone, setLensPaymentDone] = useState(false);
  const predict = useModelPredict();

  const priceWei = BigInt(Math.max(0, Math.trunc(model.price_per_query_wei)));
  const needsLensPayment =
    tokenomicsConfigured() && priceWei > BigInt(0) && model.active;
  const canRunInference = !needsLensPayment || lensPaymentDone;

  const payWrite = useWriteContract();
  const payReceipt = useWaitForTransactionReceipt({ hash: payWrite.data });
  const pendingAction = useRef<"approve" | "pay" | null>(null);

  useEffect(() => {
    if (payReceipt.isSuccess && pendingAction.current === "pay") {
      setLensPaymentDone(true);
      pendingAction.current = null;
    }
  }, [payReceipt.isSuccess]);

  const approveOracle = () => {
    if (!address || !needsLensPayment) return;
    pendingAction.current = "approve";
    payWrite.writeContract({
      address: LENS_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [COHORT_ORACLE_ADDRESS, priceWei],
    });
  };

  const payOracleFee = () => {
    if (!needsLensPayment) return;
    pendingAction.current = "pay";
    payWrite.writeContract({
      address: COHORT_ORACLE_ADDRESS,
      abi: cohortOracleAbi,
      functionName: "requestPrediction",
      args: [BigInt(model.id), "0x"],
    });
  };

  const features = useMemo(() => parseFeatures(rawFeatures), [rawFeatures]);

  const poll = useQuery({
    queryKey: ["models", "prediction", taskId],
    queryFn: () => fetchPredictionStatus(taskId!),
    enabled: Boolean(taskId),
    refetchInterval: (q) => {
      const st = q.state.data?.state;
      if (st === "SUCCESS" || st === "FAILURE") {
        return false;
      }
      return 800;
    },
  });

  useEffect(() => {
    if (!predict.isSuccess || !predict.data?.async_mode || !predict.data.task_id) {
      return;
    }
    setTaskId(predict.data.task_id);
  }, [predict.isSuccess, predict.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskId(null);
    if (!features) {
      return;
    }
    if (!canRunInference) {
      return;
    }
    void predict.mutateAsync({
      modelId: model.id,
      features,
      asyncMode,
    });
  };

  const syncResult =
    predict.data && !predict.data.async_mode ? predict.data.result : null;
  const asyncResult =
    poll.data?.state === "SUCCESS" ? poll.data.result : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold text-white">Inference</h2>
      <p className="mt-1 text-sm text-slate-400">
        Numeric vector (comma-separated or JSON). With a connected wallet, an
        EIP-191 signature is sent if the backend requires it.
      </p>

      {needsLensPayment && (
        <div className="mt-6 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-100">On-chain LENS fee</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Approve and pay {formatEther(priceWei)} LENS to the oracle before running inference
            (matches registry price for this model).
          </p>
          {!isConnected && (
            <p className="mt-2 text-xs text-amber-300">Connect your wallet to pay.</p>
          )}
          {isConnected && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void approveOracle()}
                disabled={payWrite.isPending || lensPaymentDone}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
              >
                Approve LENS
              </button>
              <button
                type="button"
                onClick={() => void payOracleFee()}
                disabled={payWrite.isPending || lensPaymentDone}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Confirm payment
              </button>
              {lensPaymentDone && (
                <span className="text-xs text-emerald-300">Payment recorded on-chain.</span>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-500">
            Features
          </span>
          <textarea
            value={rawFeatures}
            onChange={(e) => setRawFeatures(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="0.1, 0.2 or [0.1, 0.2]"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={asyncMode}
            onChange={(e) => setAsyncMode(e.target.checked)}
            className="rounded border-slate-600"
          />
          Async queue (Celery)
        </label>

        <button
          type="submit"
          disabled={!features || predict.isPending || !canRunInference}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {predict.isPending
            ? "Running…"
            : !canRunInference
              ? "Pay LENS fee first"
              : "Run prediction"}
        </button>
      </form>

      {features === null && rawFeatures.trim() !== "" && (
        <p className="mt-4 text-sm text-amber-200">
          Invalid format. Use comma-separated numbers or a JSON array.
        </p>
      )}

      {predict.isError && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-red-950/40 p-3 text-xs text-red-100">
          {String(predict.error)}
        </pre>
      )}

      {syncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-sm text-emerald-100">
          {JSON.stringify(syncResult, null, 2)}
        </pre>
      )}

      {taskId && poll.isFetching && (
        <p className="mt-4 text-sm text-slate-400">
          Task {taskId}: {poll.data?.state ?? "PENDING"}…
        </p>
      )}

      {asyncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-sm text-emerald-100">
          {JSON.stringify(asyncResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
