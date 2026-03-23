"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSignMessage } from "wagmi";

import {
  authNonceUrl,
  modelPredictUrl,
  modelsListUrl,
  predictionStatusUrl,
} from "@/lib/models-api";
import type { LensPublic, PredictResponse, PredictTaskStatus } from "@/types/model";

import { useWallet } from "./useWallet";

async function fetchModels(syncChain: boolean): Promise<LensPublic[]> {
  const { data } = await axios.get<LensPublic[]>(modelsListUrl(syncChain), {
    timeout: 60_000,
  });
  return data;
}

async function fetchPredictionStatus(taskId: string): Promise<PredictTaskStatus> {
  const { data } = await axios.get<PredictTaskStatus>(
    predictionStatusUrl(taskId),
    { timeout: 30_000 },
  );
  return data;
}

/**
 * Lists registered models (`GET /api/v1/models`).
 */
export function useModelsList(syncChain = false) {
  return useQuery({
    queryKey: ["models", "list", syncChain],
    queryFn: () => fetchModels(syncChain),
  });
}

type PredictArgs = {
  modelId: number;
  features: number[];
  asyncMode?: boolean;
  /** If a wallet is connected, sign the standard message (when the backend requires auth). */
  useWalletSignature?: boolean;
};

async function buildWalletAuthHeaders(
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
): Promise<Record<string, string>> {
  const { data } = await axios.get<{ nonce: string }>(authNonceUrl(), {
    timeout: 15_000,
  });
  const nonce = data.nonce;
  const message = `CohortLens auth\nNonce: ${nonce}\n`;
  const signature = await signMessageAsync({ message });
  return {
    "X-Wallet-Address": address,
    "X-Wallet-Signature": signature,
    "X-Wallet-Nonce": nonce,
  };
}

/**
 * Sync or async prediction; optionally adds EIP-191 signature headers.
 */
export function useModelPredict() {
  const { address, isConnected } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["models", "predict"],
    mutationFn: async ({
      modelId,
      features,
      asyncMode,
      useWalletSignature = true,
    }: PredictArgs): Promise<PredictResponse> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (
        useWalletSignature &&
        isConnected &&
        address &&
        signMessageAsync
      ) {
        try {
          const auth = await buildWalletAuthHeaders(address, signMessageAsync);
          Object.assign(headers, auth);
        } catch {
          /* no signature: backend may still accept the request */
        }
      }

      const { data } = await axios.post<PredictResponse>(
        modelPredictUrl(modelId, { asyncMode }),
        { features },
        { headers, timeout: 120_000 },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export { fetchPredictionStatus };
