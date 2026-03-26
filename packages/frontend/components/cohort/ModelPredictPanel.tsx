"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatEther } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { fetchPredictionStatus, useModelPredict } from "@/hooks/useModelsApi";
import { primaryButtonClass } from "@/lib/button-classes";
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
    if (!payReceipt.isSuccess) return;
    if (pendingAction.current === "pay") {
      setLensPaymentDone(true);
      pendingAction.current = null;
      toast.success("LENS payment confirmed");
    } else if (pendingAction.current === "approve") {
      pendingAction.current = null;
      toast.success("LENS approved for the oracle");
    }
  }, [payReceipt.isSuccess]);

  useEffect(() => {
    if (payWrite.error) {
      toast.error(payWrite.error.message);
    }
  }, [payWrite.error]);

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

  const asyncToastKey = useRef<string | null>(null);
  useEffect(() => {
    const st = poll.data?.state;
    const tid = taskId;
    if (!tid || !st) return;
    if (st === "SUCCESS" && poll.data?.result) {
      if (asyncToastKey.current !== `ok-${tid}`) {
        asyncToastKey.current = `ok-${tid}`;
        toast.success("Async prediction complete");
      }
    } else if (st === "FAILURE") {
      if (asyncToastKey.current !== `fail-${tid}`) {
        asyncToastKey.current = `fail-${tid}`;
        toast.error("Prediction task failed");
      }
    }
  }, [poll.data?.state, poll.data?.result, taskId]);

  useEffect(() => {
    if (!predict.isSuccess || !predict.data?.async_mode || !predict.data.task_id) {
      return;
    }
    setTaskId(predict.data.task_id);
  }, [predict.isSuccess, predict.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskId(null);
    asyncToastKey.current = null;
    if (!features) {
      if (rawFeatures.trim() !== "") {
        toast.warning("Invalid features format");
      }
      return;
    }
    if (!canRunInference) {
      toast.warning("Pay the LENS fee first");
      return;
    }
    void predict
      .mutateAsync({
        modelId: model.id,
        features,
        asyncMode,
      })
      .then((data) => {
        if (data.async_mode) {
          toast.info("Task queued — results will appear when ready.");
        } else {
          toast.success("Prediction complete");
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      });
  };

  const syncResult =
    predict.data && !predict.data.async_mode ? predict.data.result : null;
  const asyncResult =
    poll.data?.state === "SUCCESS" ? poll.data.result : null;

  return (
    <div className="surface-card">
      <h2 className="text-lg font-semibold text-foreground">Inference</h2>
      <p className="mt-1 text-sm text-muted-foreground">
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
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Features
          </span>
          <textarea
            value={rawFeatures}
            onChange={(e) => setRawFeatures(e.target.value)}
            rows={4}
            className="input-field mt-2 min-h-[7rem] w-full resize-y font-mono text-sm"
            placeholder="0.1, 0.2 or [0.1, 0.2]"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-card-foreground">
          <input
            type="checkbox"
            checked={asyncMode}
            onChange={(e) => setAsyncMode(e.target.checked)}
            className="rounded border-border/30 bg-background text-accent focus:ring-accent"
          />
          Async queue (Celery)
        </label>

        <button
          type="submit"
          disabled={!features || predict.isPending || !canRunInference}
          className={`${primaryButtonClass} disabled:cursor-not-allowed`}
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
        <pre className="mt-4 overflow-x-auto rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
          {String(predict.error)}
        </pre>
      )}

      {syncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border/10 bg-background/90 p-4 font-mono text-sm text-emerald-300/90">
          {JSON.stringify(syncResult, null, 2)}
        </pre>
      )}

      {taskId && poll.isFetching && (
        <p className="mt-4 text-sm text-muted-foreground">
          Task {taskId}: {poll.data?.state ?? "PENDING"}…
        </p>
      )}

      {asyncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border/10 bg-background/90 p-4 font-mono text-sm text-emerald-300/90">
          {JSON.stringify(asyncResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
